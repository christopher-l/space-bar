const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addCombo, addSpinButton, addTextEntry } from 'preferences/common';

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
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-color',
            title: 'Active workspace color',
        }).addResetButton({ window: this.window });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-font-weight',
            title: 'Font weight of active workspace',
            options: fontWeightOptions,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-radius',
            title: 'Active workspace border radius',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-h',
            title: 'Active workspace horizontal padding',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-v',
            title: 'Active workspace vertical padding',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        this.page.add(group);
    }

    private _initInactiveWorkspaceGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Inactive Workspace');
        addTextEntry({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-color',
            title: 'Inactive workspace color',
        }).addResetButton({ window: this.window });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-font-weight',
            title: 'Font weight of inactive workspace',
            options: fontWeightOptions,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-font-weight',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-radius',
            title: 'Inactive workspace border radius',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-radius',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-padding-h',
            title: 'Inactive workspace horizontal padding',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-padding-h',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-padding-v',
            title: 'Inactive workspace vertical padding',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-padding-v',
        });
        this.page.add(group);
    }
}
