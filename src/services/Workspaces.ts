import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { WindowManager } from 'resource:///org/gnome/shell/ui/windowManager.js';
import { DebouncingNotifier } from '../utils/DebouncingNotifier';
import { Subject } from '../utils/Subject';
import { hook } from '../utils/hook';
import { Settings } from './Settings';
import { WorkspaceNames } from './WorkspaceNames';

// Adapted from https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/45.0/js/ui/altTab.js?ref_type=tags#L53
function getWindows(workspace: Meta.Workspace): Meta.Window[] {
    const windows = global.display.get_tab_list(Meta.TabList.NORMAL_ALL, workspace);
    return windows
        .map((w) => (w.is_attached_dialog() ? w.get_transient_for()! : w))
        .filter((w, i, a) => !w.skipTaskbar && a.indexOf(w) === i);
}

export interface WorkspaceState {
    isEnabled: boolean;
    /** Whether the workspace is currently shown in the workspaces bar. */
    isVisible: boolean;
    index: number;
    name?: string | null;
    hasWindows: boolean;
}

export type UpdateReason =
    | 'init'
    | 'active-workspace-changed'
    | 'workspaces-changed'
    | 'workspace-names-changed'
    | 'windows-changed';

type Workspace = any;
type Window = any;

export class Workspaces {
    static _instance: Workspaces | null;

    static init() {
        Workspaces._instance = new Workspaces();
        Workspaces._instance.init();
    }

    static destroy() {
        Workspaces._instance!.destroy();
        Workspaces._instance = null;
    }

    static getInstance(): Workspaces {
        return Workspaces._instance as Workspaces;
    }

    numberOfEnabledWorkspaces = 0;
    lastVisibleWorkspace = 0;
    currentIndex = 0;
    workspaces: WorkspaceState[] = [];

    private _debouncedWorkspaceNotifier = new DebouncingNotifier<number>({
        delayMs: 1000,
        renew: true,
    });
    /**
     * The previously active workspace to return to with the activate-previous
     * shortcut.
     */
    private _previousWorkspace = 0;
    /**
     * A debounced version of the currently active workspace used as candidate
     * for the next "previous workspace".
     */
    private _debouncedCurrentWorkspace = 0;
    private _metaWorkspaces: Meta.Workspace[] = [];
    private _ws_changed?: number;
    private _ws_reordered?: number;
    private _ws_active_changed?: number;
    private _windows_changed?: number;
    private _settings = Settings.getInstance();
    private _wsNames?: WorkspaceNames | null;
    private _updateNotifier = new DebouncingNotifier();
    private _smartNamesNotifier = new DebouncingNotifier();
    /**
     * Listeners for windows being added to a workspace.
     *
     * The listeners are connected to a workspace and there is one listener per workspace that needs
     * tracking.
     */
    private _windowChangedListeners: { workspace: Meta.Workspace; listener: number }[] = [];

    init() {
        this._wsNames = WorkspaceNames.init(this);
        this._ws_reordered = global.workspace_manager.connect('workspaces-reordered', () => {
            this._update('workspaces-changed', 'workspace_manager workspaces-reordered');
        });
        this._ws_changed = global.workspace_manager.connect('notify::n-workspaces', () => {
            this._update('workspaces-changed', 'workspace_manager n-workspaces');
        });
        this._debouncedWorkspaceNotifier.subscribe((index) => {
            this._debouncedCurrentWorkspace = index;
        });
        this._ws_active_changed = global.workspace_manager.connect(
            'active-workspace-changed',
            () => {
                const previous = this.currentIndex;
                this._update(
                    'active-workspace-changed',
                    'workspace_manager active-workspace-changed',
                );
                this._debouncedWorkspaceNotifier.notify(this.currentIndex);
                // Use _debouncedCurrentWorkspace as the next "previous workspace"...
                if (this._debouncedCurrentWorkspace !== this.currentIndex) {
                    this._previousWorkspace = this._debouncedCurrentWorkspace;
                } else {
                    // ...unless we came back to it. Then use the previously
                    // active workspace, even if it was active only briefly.
                    this._previousWorkspace = previous;
                }
                // We need to update names in case we moved away from the last dynamic workspace.
                this._smartNamesNotifier.notify();
            },
        );
        // Additionally to tracking new windows on workspaces, we need to track windows that change
        // their names after being opened.
        this._windows_changed = Shell.WindowTracker.get_default().connect(
            'tracked-windows-changed',
            () => {
                this._update('windows-changed', 'WindowTracker tracked-windows-changed');
                this._smartNamesNotifier.notify();
            },
        );
        this._settings.dynamicWorkspaces.subscribe(() =>
            this._update('workspaces-changed', 'settings dynamicWorkspaces'),
        );
        this._settings.workspaceNames.subscribe(() =>
            this._update('workspace-names-changed', 'settings workspaceNames'),
        );
        this._settings.showEmptyWorkspaces.subscribe(() =>
            this._update('workspaces-changed', 'settings showEmptyWorkspaces'),
        );
        hook(WindowManager, 'insertWorkspace', 'before', (_, pos: number) => {
            // GNOME shell calls `insertWorkspace` even when workspaces are
            // static. It just returns in this case.
            if (this._settings.dynamicWorkspaces.value) {
                this._wsNames?.insert(pos);
            }
        });
        this._update('init', 'init');
        this._settings.smartWorkspaceNames.subscribe(
            (value) => value && this._clearEmptyWorkspaceNames(),
            { emitCurrentValue: true },
        );
        this._settings.smartWorkspaceNames.subscribe(() => this._updateWindowAddedListeners());
        this._settings.reevaluateSmartWorkspaceNames.subscribe(() =>
            this._updateWindowAddedListeners(),
        );
        // Update smart workspaces after a small delay because workspaces can briefly get into
        // inconsistent states while empty dynamic workspaces are being removed.
        this._smartNamesNotifier.subscribe(() => this._updateSmartWorkspaceNames());
    }

    destroy() {
        this._debouncedWorkspaceNotifier.destroy();
        this._wsNames = null;
        if (this._ws_changed) {
            global.workspace_manager.disconnect(this._ws_changed);
        }
        if (this._ws_reordered) {
            global.workspace_manager.disconnect(this._ws_reordered);
        }
        if (this._ws_active_changed) {
            global.workspace_manager.disconnect(this._ws_active_changed);
        }
        if (this._windows_changed) {
            Shell.WindowTracker.get_default().disconnect(this._windows_changed);
        }
        this._updateNotifier.destroy();
        this._smartNamesNotifier.destroy();
        this._windowChangedListeners.forEach((entry) => entry.workspace.disconnect(entry.listener));
    }

    onUpdate(callback: () => void, until?: Subject<void>) {
        this._updateNotifier.subscribe(callback, until);
    }

    activate(index: number, { focusWindowIfCurrentWorkspace = false } = {}) {
        const isCurrentWorkspace = global.workspace_manager.get_active_workspace_index() === index;
        const workspace = global.workspace_manager.get_workspace_by_index(index);
        if (isCurrentWorkspace) {
            if (
                focusWindowIfCurrentWorkspace &&
                this.workspaces[index].hasWindows &&
                global.display.get_focus_window().is_on_all_workspaces()
            ) {
                this.focusMostRecentWindowOnWorkspace(workspace);
            } else {
                if (this._settings.toggleOverview.value) {
                    Main.overview.toggle();
                }
            }
        } else {
            if (workspace) {
                workspace.activate(global.get_current_time());
                this.focusMostRecentWindowOnWorkspace(workspace);
                if (
                    !Main.overview.visible &&
                    !this.workspaces[index].hasWindows &&
                    this._settings.toggleOverview.value
                ) {
                    Main.overview.show();
                }
            }
        }
    }

    /**
     * Activates the previously active workspace.
     *
     * The previous workspace is determined by a debounced variable for the
     * active workspace, so only briefly activated workspaces are not
     * considered.
     *
     * When calling this function, the workspace activated by it will become the
     * next "previous workspace" even if active only briefly.
     */
    activatePrevious() {
        const previous = this._previousWorkspace;
        this._debouncedCurrentWorkspace = previous;
        this.activate(previous);
    }

    addWorkspace() {
        if (this._settings.dynamicWorkspaces.value) {
            this.activate(this.numberOfEnabledWorkspaces - 1);
        } else {
            this._addStaticWorkspace();
        }
    }

    activateEmptyOrAdd() {
        const index = this.workspaces.findIndex(
            (workspace) => workspace.isEnabled && !workspace.hasWindows,
        );
        if (index >= 0) {
            this.activate(index);
        } else {
            this._addStaticWorkspace();
        }
    }

    _addStaticWorkspace() {
        global.workspace_manager.append_new_workspace(true, global.get_current_time());
        // We want to show the overview here when the corresponding setting is
        // enabled, however, this doesn't play well together with activating the
        // newly created workspace.
        //
        // if (!Main.overview.visible && this._settings.toggleOverview.value) {
        //     Main.overview.show();
        // }
    }

    removeWorkspace(index: number) {
        const workspace = global.workspace_manager.get_workspace_by_index(index);
        if (workspace) {
            global.workspace_manager.remove_workspace(workspace, global.get_current_time());
        }
    }

    reorderWorkspace(oldIndex: number, newIndex: number): void {
        const workspace = global.workspace_manager.get_workspace_by_index(oldIndex);
        if (workspace) {
            global.workspace_manager.reorder_workspace(workspace, newIndex);
        }
    }

    moveCurrentWorkspace(direction: -1 | 1): void {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.numberOfEnabledWorkspaces) {
            this.reorderWorkspace(this.currentIndex, newIndex);
        }
    }

    getDisplayName(workspace: WorkspaceState): string {
        if (this.isExtraDynamicWorkspace(workspace)) {
            return '+';
        }
        if (this._settings.enableCustomLabel.value) {
            return this.getCustomDisplayName(workspace);
        } else {
            return this.getDefaultDisplayName(workspace);
        }
    }

    getDefaultDisplayName(workspace: WorkspaceState): string {
        if (workspace.name && !this._settings.alwaysShowNumbers.value) {
            return workspace.name;
        }
        let numberString = `${workspace.index + 1}`;
        if (workspace.name) {
            return `${numberString}: ${workspace.name}`;
        } else {
            return numberString;
        }
    }

    getCustomDisplayName(workspace: WorkspaceState): string {
        let template: string;
        if (workspace.name) {
            template = this._settings.customLabelNamed.value;
        } else {
            template = this._settings.customLabelUnnamed.value;
        }
        let total = this.numberOfEnabledWorkspaces;
        if (
            this._settings.dynamicWorkspaces.value &&
            this.currentIndex !== this.numberOfEnabledWorkspaces - 1
        ) {
            total = this.numberOfEnabledWorkspaces - 1;
        }
        let displayName = template
            .replaceAll('{{name}}', workspace.name ?? '')
            .replaceAll('{{number}}', `${workspace.index + 1}`)
            .replaceAll('{{total}}', `${total}`)
            .replaceAll('{{Total}}', `${this.numberOfEnabledWorkspaces}`);
        if (this._settings.alwaysShowNumbers.value && !template.includes('{{number}}')) {
            return `${workspace.index + 1}: ${displayName}`;
        } else {
            return displayName;
        }
    }

    focusMostRecentWindowOnWorkspace(workspace: Workspace) {
        const mostRecentWindowOnWorkspace = getWindows(workspace).find(
            (window: Window) => !window.is_on_all_workspaces(),
        );
        if (mostRecentWindowOnWorkspace) {
            workspace.activate_with_focus(mostRecentWindowOnWorkspace, global.get_current_time());
        }
    }

    /**
     * Looks for a workspace that is visible in the workspaces bar relative to the current
     * workspace.
     *
     * @param step indicates the direction in which to look
     * @returns the index of the found workspace or `null` if there is no visible workspace in the
     * given direction
     */
    findVisibleWorkspace(step: -1 | 1, { wraparound = false } = {}): number | null {
        let index = this.currentIndex;
        const startingIndex = index;
        while (true) {
            index += step;
            if (index < 0 || index >= this.numberOfEnabledWorkspaces) {
                if (wraparound) {
                    // Prevent infinite loop when there is no other workspace to go to.
                    if (index === startingIndex) {
                        return null;
                    }
                    index =
                        (index + this.numberOfEnabledWorkspaces) % this.numberOfEnabledWorkspaces;
                } else {
                    break;
                }
            }
            if (this.workspaces[index].isVisible) {
                return index;
            }
        }
        return null;
    }

    /**
     * When using dynamic workspaces, whether `workspace` is the extra last workspace, that is
     * currently neither used nor focused.
     */
    isExtraDynamicWorkspace(workspace: WorkspaceState): boolean {
        return (
            this._settings.dynamicWorkspaces.value &&
            workspace.index > 0 &&
            workspace.index === this.numberOfEnabledWorkspaces - 1 &&
            !workspace.hasWindows &&
            this.currentIndex !== workspace.index
        );
    }

    /**
     * Updates workspaces info managed by this class.
     *
     * @param reason The external cause that makes an update necessary
     * @param source The unit that notified us of the change (used for debugging)
     */
    private _update(reason: UpdateReason, source: string): void {
        // log('_update', reason, source);
        this.numberOfEnabledWorkspaces = global.workspace_manager.get_n_workspaces();
        this.currentIndex = global.workspace_manager.get_active_workspace_index();
        if (
            this._settings.dynamicWorkspaces.value &&
            !this._settings.showEmptyWorkspaces.value &&
            this.currentIndex !== this.numberOfEnabledWorkspaces - 1
        ) {
            this.lastVisibleWorkspace = this.numberOfEnabledWorkspaces - 2;
        } else {
            this.lastVisibleWorkspace = this.numberOfEnabledWorkspaces - 1;
        }
        const numberOfTrackedWorkspaces = Math.max(
            this.numberOfEnabledWorkspaces,
            this._settings.workspaceNames.value.length,
        );
        this.workspaces = [...Array(numberOfTrackedWorkspaces)].map((_, index) =>
            this._getWorkspaceState(index),
        );
        this._updateNotifier.notify();

        if (reason === 'workspaces-changed' || reason === 'init') {
            this._handleWorkspacesReordered();
        }
        if (
            reason === 'workspaces-changed' ||
            reason === 'workspace-names-changed' ||
            reason === 'init'
        ) {
            this._updateWindowAddedListeners();
        }
    }

    /**
     * Matches known workspaces with current workspaces to identify reordered workspaces and adapt
     * names accordingly.
     *
     * Also updates known workspaces.
     */
    private _handleWorkspacesReordered(): void {
        const newMetaWorkspaces = this._getMetaWorkspaces();
        const reorderMap: number[] = [];
        let hasReordered = false;
        for (const [index, metaWorkspace] of newMetaWorkspaces.entries()) {
            const oldIndex = this._metaWorkspaces.indexOf(metaWorkspace);
            reorderMap[index] = oldIndex;
            if (oldIndex !== -1 && oldIndex !== index) {
                hasReordered = true;
            }
        }
        if (hasReordered) {
            this._wsNames?.reorder(reorderMap);
        }
        this._metaWorkspaces = newMetaWorkspaces;
    }

    private _getMetaWorkspaces(): Meta.Workspace[] {
        return Array.from({ length: this.numberOfEnabledWorkspaces }).map(
            (_, i) => global.workspace_manager.get_workspace_by_index(i)!,
        );
    }

    /**
     * Updates the listeners for added and removed windows on workspaces.
     *
     * Connects listeners to workspaces that newly need to be tracked and removes the ones from
     * workspaces that don't need tracking anymore.
     *
     * Records and updates all connected listeners in `_windowAddedListeners`.
     */
    private _updateWindowAddedListeners() {
        // Listeners are only added when smart workspace names are enabled and the workspace does
        // not yet have a name. They are removed as soon as the setting is turned off or the
        // workspace is assigned a name.
        //
        // We need to track `window-added` signals in addition to `tracked-windows-changed` signals
        // so we catch windows that have been moved from another monitor to the primary monitor.

        // Add missing listeners.
        if (this._settings.smartWorkspaceNames.value) {
            for (const workspace of this.workspaces) {
                if (
                    !this._windowChangedListeners.some(
                        (entry) => entry.workspace.index() === workspace.index,
                    )
                ) {
                    const metaWorkspace = global.workspace_manager.get_workspace_by_index(
                        workspace.index,
                    );
                    if (metaWorkspace) {
                        const listenerAdded = metaWorkspace.connect('window-added', () => {
                            this._update('windows-changed', 'Workspace window-added');
                            this._updateSmartWorkspaceNames();
                        });
                        this._windowChangedListeners.push({
                            workspace: metaWorkspace,
                            listener: listenerAdded,
                        });
                        if (this._settings.reevaluateSmartWorkspaceNames.value) {
                            const listenerRemoved = metaWorkspace.connect('window-removed', () => {
                                this._update('windows-changed', 'Workspace window-removed');
                                this._updateSmartWorkspaceNames();
                            });
                            this._windowChangedListeners.push({
                                workspace: metaWorkspace,
                                listener: listenerRemoved,
                            });
                        }
                    }
                }
            }
        }
        // Remove unneeded listeners.
        let removedListener = false;
        this._windowChangedListeners.forEach((entry, arrayIndex) => {
            const workspace = this.workspaces[entry.workspace.index()];
            if (
                !this._settings.smartWorkspaceNames.value ||
                !workspace ||
                (workspace.name && !this._settings.reevaluateSmartWorkspaceNames.value) ||
                !workspace.isEnabled
            ) {
                entry.workspace.disconnect(entry.listener);
                delete this._windowChangedListeners[arrayIndex];
                removedListener = true;
            }
        });
        if (removedListener) {
            this._windowChangedListeners = this._windowChangedListeners.filter(
                (entry) => entry != null,
            );
        }
    }

    private _updateSmartWorkspaceNames(): void {
        if (this._settings.smartWorkspaceNames.value) {
            for (const workspace of this.workspaces) {
                if (
                    this._settings.reevaluateSmartWorkspaceNames.value &&
                    workspace.name &&
                    !this._wsNames!.workspaceNameIsSupportedByWindows(workspace)
                ) {
                    this._wsNames!.rename(workspace.index, '');
                    workspace.name = '';
                }
                if (workspace.hasWindows && !workspace.name) {
                    this._wsNames!.restoreSmartWorkspaceName(workspace.index);
                }
                if (this.isExtraDynamicWorkspace(workspace)) {
                    this._wsNames!.remove(workspace.index);
                }
            }
        }
    }

    private _clearEmptyWorkspaceNames(): void {
        for (const workspace of this.workspaces) {
            if (
                (!workspace.isEnabled || this.isExtraDynamicWorkspace(workspace)) &&
                typeof workspace.name === 'string'
            ) {
                // Completely remove disabled workspaces from the names array.
                this._wsNames!.remove(workspace.index);
            } else if (!workspace.hasWindows && workspace.name) {
                // Keep empty workspaces in the names array to not mix up names of workspaces after.
                this._wsNames!.rename(workspace.index, '');
            }
        }
    }

    private _getWorkspaceState(index: number): WorkspaceState {
        if (index < this.numberOfEnabledWorkspaces) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);
            const hasWindows = getNumberOfWindows(workspace) > 0;
            return {
                isEnabled: true,
                isVisible: hasWindows || this._getIsEmptyButVisible(index),
                hasWindows,
                index,
                name: this._settings.workspaceNames.value[index],
            };
        } else {
            return {
                isEnabled: false,
                isVisible: false,
                hasWindows: false,
                index,
                name: this._settings.workspaceNames.value[index],
            };
        }
    }

    /**
     * @param index index of an enabled workspace that has no windows
     */
    private _getIsEmptyButVisible(index: number): boolean {
        if (index === this.currentIndex) {
            return true;
        } else if (
            // The last workspace for dynamic workspaces is a special case.
            this._settings.dynamicWorkspaces.value &&
            !this._settings.showEmptyWorkspaces.value
        ) {
            return false;
        } else {
            return this._settings.showEmptyWorkspaces.value;
        }
    }
}

/**
 * Returns the number of windows on the given workspace, excluding windows on all workspaces, e.g.,
 * windows on a secondary screen when workspaces do not span all screens.
 */
function getNumberOfWindows(workspace: Workspace) {
    const windows: Window[] = workspace.list_windows();
    return windows.filter((window) => !window.is_on_all_workspaces()).length;
}
