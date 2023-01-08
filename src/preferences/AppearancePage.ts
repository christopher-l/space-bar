const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addTextEntry } from 'preferences/common';

export class AppearancePage {
    window!: Adw.PreferencesWindow;
    readonly page = new Adw.PreferencesPage();
    private readonly _settings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.appearance`,
    );

    init() {
        this.page.set_title('Appearance');
        this.page.set_icon_name('preferences-system-symbolic');
        this._initActiveWorkspaceGroup();
    }

    private _initActiveWorkspaceGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Active Workspace');
        addTextEntry({
            settings: this._settings,
            group,
            key: 'active-workspace-color',
            title: 'Active workspace color',
        });
        this.page.add(group);
    }
}
