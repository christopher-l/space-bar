const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Adw } from 'imports/gi';
import { addCombo, addSpinButton, addTextEntry } from 'preferences/common';

export const fontWeightOptions = {
    '100': 'Thin',
    '200': 'Extra Light',
    '300': 'Light',
    '400': 'Normal',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
    '800': 'Extra Bold',
    '900': 'Black',
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
            key: 'active-workspace-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-font-weight',
            title: 'Font weight',
            options: fontWeightOptions,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-border-radius',
            title: 'Border radius',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-h',
            title: 'Horizontal padding',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-padding-v',
            title: 'Vertical padding',
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
            key: 'inactive-workspace-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-font-weight',
            title: 'Font weight',
            options: fontWeightOptions,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-font-weight',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-border-radius',
            title: 'Border radius',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-border-radius',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-padding-h',
            title: 'Horizontal padding',
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
            title: 'Vertical padding',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-padding-v',
        });
        this.page.add(group);
    }
}
