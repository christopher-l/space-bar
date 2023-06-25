import { Meta, Shell } from 'imports/gi';
import { Settings } from 'services/Settings';
import { WorkspaceNames } from 'services/WorkspaceNames';
import { DebouncingNotifier } from 'utils/DebouncingNotifier';
import { Timeout } from 'utils/Timeout';
const Main = imports.ui.main;
const AltTab = imports.ui.altTab;

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

    private _previousWorkspace = 0;
    private _ws_changed?: number;
    private _ws_removed?: number;
    private _ws_active_changed?: number;
    private _windows_changed?: number;
    private _settings = Settings.getInstance();
    private _wsNames?: WorkspaceNames | null;
    private _updateNotifier = new DebouncingNotifier();
    private _smartNamesNotifier = new DebouncingNotifier();
    private _timeout = new Timeout();
    /**
     * Listeners for windows being added to a workspace.
     *
     * The listeners are connected to a workspace and there is one listener per workspace that needs
     * tracking.
     */
    private _windowAddedListeners: { workspace: Meta.Workspace; listener: number }[] = [];

    init() {
        this._wsNames = WorkspaceNames.init(this);
        let numberOfWorkspacesChangeHandled = false;
        this._ws_removed = global.workspace_manager.connect('workspace-removed', (_, index) => {
            this._update('workspaces-changed', 'workspace_manager workspace_removed');
            this._wsNames!.remove(index);
            numberOfWorkspacesChangeHandled = true;
        });
        this._ws_changed = global.workspace_manager.connect('notify::n-workspaces', () => {
            if (numberOfWorkspacesChangeHandled) {
                numberOfWorkspacesChangeHandled = false;
            } else {
                this._update('workspaces-changed', 'workspace_manager n-workspaces');
            }
        });

        this._ws_active_changed = global.workspace_manager.connect(
            'active-workspace-changed',
            () => {
                this._previousWorkspace = this.currentIndex;
                this._update(
                    'active-workspace-changed',
                    'workspace_manager active-workspace-changed',
                );
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
            this._update('workspaces-changed', 'settings workspaceNames'),
        );
        this._settings.showEmptyWorkspaces.subscribe(() =>
            this._update('workspaces-changed', 'settings showEmptyWorkspaces'),
        );
        this._update('init', 'init');
        this._settings.smartWorkspaceNames.subscribe(
            (value) => value && this._clearEmptyWorkspaceNames(),
            { emitCurrentValue: true },
        );
        this._settings.smartWorkspaceNames.subscribe(() => this._updateWindowAddedListeners());
        // Update smart workspaces after a small delay because workspaces can briefly get into
        // inconsistent states while empty dynamic workspaces are being removed.
        this._smartNamesNotifier.subscribe(() => this._updateSmartWorkspaceNames());
    }

    destroy() {
        this._wsNames = null;
        if (this._ws_changed) {
            global.workspace_manager.disconnect(this._ws_changed);
        }
        if (this._ws_removed) {
            global.workspace_manager.disconnect(this._ws_removed);
        }
        if (this._ws_active_changed) {
            global.workspace_manager.disconnect(this._ws_active_changed);
        }
        if (this._windows_changed) {
            Shell.WindowTracker.get_default().disconnect(this._windows_changed);
        }
        this._updateNotifier.destroy();
        this._smartNamesNotifier.destroy();
        this._timeout.destroy();
        this._windowAddedListeners.forEach((entry) => entry.workspace.disconnect(entry.listener));
    }

    onUpdate(callback: () => void) {
        this._updateNotifier.subscribe(callback);
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
                this._timeout.tick().then(() => Main.overview.toggle());
            }
        } else {
            if (workspace) {
                workspace.activate(global.get_current_time());
                this.focusMostRecentWindowOnWorkspace(workspace);
                if (
                    !Main.overview.visible &&
                    !this.workspaces[index].hasWindows &&
                    this._settings.overviewOnEmptyWorkspace.value
                ) {
                    this._timeout.tick().then(() => Main.overview.show());
                }
            }
        }
    }

    activatePrevious() {
        this.activate(this._previousWorkspace);
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
        this._timeout.tick().then(() => Main.overview.show());
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
            // Update names first, so smart-workspace names don't get mixed up names when updating.
            this._wsNames?.moveByIndex(oldIndex, newIndex);
            global.workspace_manager.reorder_workspace(workspace, newIndex);
        }
    }

    getDisplayName(workspace: WorkspaceState): string {
        if (this._isExtraDynamicWorkspace(workspace)) {
            return '+';
        }
        return workspace.name || (workspace.index + 1).toString();
    }

    focusMostRecentWindowOnWorkspace(workspace: Workspace) {
        const mostRecentWindowOnWorkspace = AltTab.getWindows(workspace).find(
            (window: Window) => !window.is_on_all_workspaces(),
        );
        if (mostRecentWindowOnWorkspace) {
            workspace.activate_with_focus(mostRecentWindowOnWorkspace, global.get_current_time());
        }
    }

    /**
     * When using dynamic workspaces, whether `workspace` is the extra last workspace, that is
     * currently neither used nor focused.
     */
    private _isExtraDynamicWorkspace(workspace: WorkspaceState): boolean {
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
            this._updateWindowAddedListeners();
        }
    }

    /**
     * Updates the listeners for added windows on workspaces.
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
                    !workspace.name &&
                    !this._windowAddedListeners.some(
                        (entry) => entry.workspace.index() === workspace.index,
                    )
                ) {
                    const metaWorkspace = global.workspace_manager.get_workspace_by_index(
                        workspace.index,
                    );
                    if (metaWorkspace) {
                        const listener = metaWorkspace.connect('window-added', () => {
                            this._update('windows-changed', 'Workspace window-added');
                            this._updateSmartWorkspaceNames();
                        });
                        this._windowAddedListeners.push({
                            workspace: metaWorkspace,
                            listener,
                        });
                    }
                }
            }
        }
        // Remove unneeded listeners.
        let removedListener = false;
        this._windowAddedListeners.forEach((entry, arrayIndex) => {
            const workspace = this.workspaces[entry.workspace.index()];
            if (
                !this._settings.smartWorkspaceNames.value ||
                !workspace ||
                workspace.name ||
                !workspace.isEnabled
            ) {
                entry.workspace.disconnect(entry.listener);
                delete this._windowAddedListeners[arrayIndex];
                removedListener = true;
            }
        });
        if (removedListener) {
            this._windowAddedListeners = this._windowAddedListeners.filter(
                (entry) => entry != null,
            );
        }
    }

    private _updateSmartWorkspaceNames(): void {
        if (this._settings.smartWorkspaceNames.value) {
            for (const workspace of this.workspaces) {
                if (workspace.hasWindows && !workspace.name) {
                    this._wsNames!.restoreSmartWorkspaceName(workspace.index);
                }
                if (this._isExtraDynamicWorkspace(workspace)) {
                    this._wsNames!.remove(workspace.index);
                }
            }
        }
    }

    private _clearEmptyWorkspaceNames(): void {
        for (const workspace of this.workspaces) {
            if (
                (!workspace.isEnabled || this._isExtraDynamicWorkspace(workspace)) &&
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
