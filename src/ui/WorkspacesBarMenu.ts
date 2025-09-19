import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { KeyBindings } from '../services/KeyBindings';
import { Settings } from '../services/Settings';
import { WorkspaceNames } from '../services/WorkspaceNames';
import { WorkspaceState, Workspaces } from '../services/Workspaces';

export class WorkspacesBarMenu {
    private readonly _keyBindings = KeyBindings.getInstance();
    private readonly _settings = Settings.getInstance();
    private readonly _ws = Workspaces.getInstance();
    private readonly _wsNames = WorkspaceNames.getInstance();

    private _hiddenWorkspacesSection = new PopupMenu.PopupMenuSection();
    private _manageWorkspaceSection = new PopupMenu.PopupMenuSection();

    constructor(private readonly _extension: any, private readonly _menu: any) {}

    init(): void {
        this._menu.box.add_style_class_name('space-bar-menu');
        this._addSectionHeading('Rename current workspace');
        this._initEntry();
        this._menu.addMenuItem(this._hiddenWorkspacesSection);
        this._initManageWorkspaceSection();
        this._initExtensionSettingsButton();
        this._menu.connect('open-state-changed', () => {
            if (this._menu.isOpen) {
                this._refreshMenu();
            }
        });
        this._keyBindings.addKeyBinding('open-menu', () => this._menu.open());
    }

    destroy(): void {
        this._keyBindings.removeKeybinding('open-menu');
    }

    private _refreshMenu() {
        this._refreshHiddenWorkspaces();
        this._refreshManageWorkspaceSection();
    }

    private _addSectionHeading(text: string, section?: any): void {
        const separator = new PopupMenu.PopupSeparatorMenuItem(text);
        separator.label.add_style_class_name('space-bar-menu-heading');
        (section ?? this._menu).addMenuItem(separator);
    }

    private _initEntry(): void {
        const entryItem = new PopupMenuItemEntry({});
        entryItem.entry.connect('key-focus-in', () => {
            const text = entryItem.entry.get_text();
            if (text.length > 0) {
                entryItem.entry.get_clutter_text().set_selection(0, text.length);
            }
        });
        entryItem.entry.get_clutter_text().connect('activate', () => this._menu.close());
        entryItem.connect('notify::active', () => {
            if (entryItem.active) {
                entryItem.entry.grab_key_focus();
            }
        });
        let oldName = '';
        this._menu.connect('open-state-changed', () => {
            if (this._menu.isOpen) {
                oldName = this._ws.workspaces[this._ws.currentIndex].name || '';
                // Reset the selection before setting the text since the entry field won't let us do
                // that when it is empty.
                entryItem.entry.get_clutter_text().set_selection(0, 0);
                entryItem.entry.set_text(oldName);
                entryItem.active = true;
            } else {
                const newName = entryItem.entry.get_text();
                if (newName !== oldName) {
                    this._wsNames.rename(this._ws.currentIndex, newName);
                }
            }
        });
        this._menu.addMenuItem(entryItem);
    }

    private _initManageWorkspaceSection() {
        const separator = new PopupMenu.PopupSeparatorMenuItem();
        this._menu.addMenuItem(separator);
        this._menu.addMenuItem(this._manageWorkspaceSection);
    }

    private _initExtensionSettingsButton(): void {
        const separator = new PopupMenu.PopupSeparatorMenuItem();
        this._menu.addMenuItem(separator);
        const button = new PopupMenu.PopupMenuItem(`${this._extension.metadata.name} settings`);
        button.connect('activate', () => {
            this._menu.close();
            this._extension.openPreferences();
        });
        this._menu.addMenuItem(button);
    }

    private _refreshHiddenWorkspaces(): void {
        this._hiddenWorkspacesSection.box.destroy_all_children();

        let hiddenWorkspaces: WorkspaceState[];
        switch (this._settings.indicatorStyle.value) {
            case 'current-workspace':
                hiddenWorkspaces = this._ws.workspaces.filter(
                    (workspace) =>
                        workspace.isEnabled &&
                        workspace.index !== this._ws.currentIndex &&
                        !this._ws.isExtraDynamicWorkspace(workspace),
                );
                break;
            case 'workspaces-bar':
                if (
                    this._settings.showEmptyWorkspaces.value ||
                    this._settings.dynamicWorkspaces.value
                ) {
                    return;
                }
                hiddenWorkspaces = this._ws.workspaces.filter(
                    (workspace) =>
                        workspace.isEnabled &&
                        !workspace.hasWindows &&
                        workspace.index !== this._ws.currentIndex,
                );
                break;
        }
        if (hiddenWorkspaces.length > 0) {
            this._addSectionHeading('Other workspaces', this._hiddenWorkspacesSection);
            hiddenWorkspaces.forEach((workspace) => {
                let label: string;
                if (this._settings.enableCustomLabelInMenus.value) {
                    label = this._ws.getDisplayName(workspace);
                } else {
                    label = this._ws.getDefaultDisplayName(workspace);
                }
                const button = new PopupMenu.PopupMenuItem(label);
                button.connect('activate', () => {
                    this._menu.close();
                    this._ws.activate(workspace.index);
                });
                this._hiddenWorkspacesSection.addMenuItem(button);
            });
        }
    }

    private _refreshManageWorkspaceSection() {
        this._manageWorkspaceSection.box.destroy_all_children();

        if (
            !this._settings.dynamicWorkspaces.value ||
            !this._settings.showEmptyWorkspaces.value ||
            this._settings.indicatorStyle.value === 'current-workspace'
        ) {
            const newWorkspaceButton = new PopupMenu.PopupMenuItem('Add new workspace');
            newWorkspaceButton.connect('activate', () => {
                this._menu.close();
                this._ws.addWorkspace();
            });
            this._manageWorkspaceSection.addMenuItem(newWorkspaceButton);
        }
        const closeWorkspaceButton = new PopupMenu.PopupMenuItem('Remove current workspace');
        closeWorkspaceButton.connect('activate', () => {
            this._ws.removeWorkspace(this._ws.currentIndex);
        });
        this._manageWorkspaceSection.addMenuItem(closeWorkspaceButton);
    }
}

const PopupMenuItemEntry = GObject.registerClass(
    class PopupMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(params: any) {
            super._init(params);
            this.entry = new St.Entry({
                xExpand: true,
            });
            this.entry.connect('button-press-event', () => {
                return Clutter.EVENT_STOP;
            });
            this.add_child(this.entry);
        }
    },
);
