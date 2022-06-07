const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addCombo, addToggle, addSpinButton } from 'preferences/common';

export const scrollWheelOptions = {
    panel: 'Over top panel',
    'workspaces-bar': 'Over workspaces bar',
    disabled: 'Disabled',
};

export class BehaviorPage {
    window!: Adw.PreferencesWindow;
    readonly page = new Adw.PreferencesPage();
    private readonly _settings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.behavior`,
    );

    init() {
        this.page.set_title('Behavior');
        this.page.set_icon_name('preferences-system-symbolic');
        this._initGeneralGroup();
        this._initWorkspaceScrollGroup();
        this._initSmartWorkspaceNamesGroup();
    }

    private _initGeneralGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('General');
        addToggle({
            settings: this._settings,
            group,
            key: 'show-empty-workspaces',
            title: 'Show empty workspaces',
        });
        this.page.add(group);
    }

    private _initWorkspaceScrollGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Scroll Workspaces');
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'scroll-wheel',
            title: 'Switch workspaces with scroll wheel',
            options: scrollWheelOptions,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'scroll-wheel-debounce-amount',
            title: 'Scroll wheel debounce amount (milliseconds)',
            lower: 0,
            upper: 2000,
            increment: 100,
            changeSensitiveKey: "scroll-wheel",
            changeSensitiveFn: (settings) => {
                return settings.get_string("scroll-wheel") != "disabled";
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
