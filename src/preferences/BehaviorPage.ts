const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addCombo, addSpinButton, addToggle } from 'preferences/common';

export const scrollWheelOptions = {
    panel: 'Over top panel',
    'workspaces-bar': 'Over workspaces bar',
    disabled: 'Disabled',
};

export const positionOptions = {
    left: 'Left',
    center: 'Center',
    right: 'Right',
};

export class BehaviorPage {
    window!: Adw.PreferencesWindow;
    readonly page = new Adw.PreferencesPage();
    private readonly _settings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.behavior`,
    );

    init() {
        this.page.set_title('_Behavior');
        this.page.use_underline = true;
        this.page.set_icon_name('preferences-system-symbolic');
        this._initGeneralGroup();
        this._initSmartWorkspaceNamesGroup();
    }

    private _initGeneralGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('General');
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'position',
            title: 'Position in top panel',
            options: positionOptions,
        }).addSubDialog({
            window: this.window,
            title: 'Position in Top Panel',
            populatePage: (page) => {
                const positionSubDialogGroup = new Adw.PreferencesGroup();
                page.add(positionSubDialogGroup);
                addSpinButton({
                    settings: this._settings,
                    group: positionSubDialogGroup,
                    key: 'position-index',
                    title: 'Position index',
                    subtitle: 'Order relative to other elements',
                    lower: 0,
                    upper: 100,
                });
            },
        });
        addToggle({
            settings: this._settings,
            group,
            key: 'show-empty-workspaces',
            title: 'Show empty workspaces',
        }).addSubDialog({
            window: this.window,
            title: 'Show Empty Workspaces',
            // Disabling the sub dialog is not completely honest since the setting also applies to
            // switching workspaces via keyboard shortcuts. However, it is hard to communicate which
            // ones, since we don't handle system keyboard shortcuts and the setting doesn't apply
            // to switching workspaces via scroll wheel. Everything considered, this might cause
            // less confusion than a more accurate placement.
            enableIf: {
                key: 'show-empty-workspaces',
                predicate: (value) => value.get_boolean(),
                page: this.page,
            },
            populatePage: (page) => {
                const group = new Adw.PreferencesGroup();
                page.add(group);
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'overview-on-empty-workspace',
                    title: 'Open overview when clicking on an empty workspace',
                });
            },
        });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'scroll-wheel',
            title: 'Switch workspaces with scroll wheel',
            options: scrollWheelOptions,
        }).addSubDialog({
            window: this.window,
            title: 'Switch Workspaces With Scroll Wheel',
            enableIf: {
                key: 'scroll-wheel',
                predicate: (value) => value.get_string()[0] !== 'disabled',
                page: this.page,
            },
            populatePage: (page) => {
                const group = new Adw.PreferencesGroup();
                page.add(group);
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'scroll-wheel-debounce',
                    title: 'Debounce scroll events',
                });
                addSpinButton({
                    settings: this._settings,
                    group,
                    key: 'scroll-wheel-debounce-time',
                    title: 'Debounce time (ms)',
                    lower: 0,
                    upper: 2000,
                    step: 50,
                }).enableIf({
                    key: 'scroll-wheel-debounce',
                    predicate: (value) => value.get_boolean(),
                    page,
                });
            },
        });
        this.page.add(group);
    }

    private _initSmartWorkspaceNamesGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Smart Workspace Names');
        group.set_description(
            'Remembers open applications when renaming a workspace and automatically assigns workspace names based on the first application started on a new workspace.',
        );
        addToggle({
            settings: this._settings,
            group,
            key: 'smart-workspace-names',
            title: 'Enable smart workspace names',
        });
        this.page.add(group);
    }
}
