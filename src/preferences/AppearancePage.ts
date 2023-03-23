const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addCombo, addTextEntry, addSpinButton } from 'preferences/common';

export const fontWeightOptions = {
    lighter: 'Lighter',
    normal: 'Normal',
    bolder: 'Bolder',
    bold: 'Bold',
};

export class AppearancePage {
    window!: Adw.PreferencesWindow;
    readonly page = new Adw.PreferencesPage();
    private readonly _settings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.appearance`,
    );

    init() {
        this.page.set_title('Appearance');
        this.page.set_icon_name('applications-graphics-symbolic');
        this._initActiveWorkspaceGroup();
        this._initInactiveWorkspaceGroup();
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
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-font-weight',
            title: 'Font weight of active workspace',
            options: fontWeightOptions,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-radius',
            title: 'Active workspace border radius',
            lower: 0,
            upper: 255,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-h',
            title: 'Active workspace horizontal padding',
            lower: 0,
            upper: 255,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-v',
            title: 'Active workspace vertical padding',
            lower: 0,
            upper: 255,
        });
        this.page.add(group);
    }

    private _initInactiveWorkspaceGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Inactive Workspace');
        addTextEntry({
            settings: this._settings,
            group,
            key: 'inactive-workspace-color',
            title: 'Inactive workspace color',
        });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-font-weight',
            title: 'Font weight of inactive workspace',
            options: fontWeightOptions,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-radius',
            title: 'Inactive workspace border radius',
            lower: 0,
            upper: 255,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-padding-h',
            title: 'Inactive workspace horizontal padding',
            lower: 0,
            upper: 255,
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-padding-v',
            title: 'Inactive workspace vertical padding',
            lower: 0,
            upper: 255,
        });
        this.page.add(group);
    }
}
