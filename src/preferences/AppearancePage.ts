import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { addColorButton, addCombo, addSpinButton } from './common';
import { addCustomCssDialogButton } from './custom-styles';
import { overlayStylePresetOptions, overlayPresets } from './BehaviorPage';

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
    private readonly _settings: Gio.Settings;
    private readonly _behaviorSettings: Gio.Settings;

    constructor(private _extensionPreferences: any) {
        this._settings = _extensionPreferences.getSettings(
            `org.gnome.shell.extensions.space-bar.appearance`,
        );
        this._behaviorSettings = _extensionPreferences.getSettings(
            `org.gnome.shell.extensions.space-bar.behavior`,
        );
    }

    init() {
        this.page.set_title('_Appearance');
        this.page.set_name('appearance');
        this.page.useUnderline = true;
        this.page.set_icon_name('applications-graphics-symbolic');
        this._connectEnabledConditions();
        this._initGeneralGroup();
        this._initActiveWorkspaceGroup();
        this._initInactiveWorkspaceGroup();
        this._initEmptyWorkspaceGroup();
        this._initOverlayGroup();
        this._initCustomStylesGroup();
    }

    private readonly _workspacesBarGroups: Adw.PreferencesGroup[] = [];

    private _connectEnabledConditions() {
        const disabledNoticeGroup = new Adw.PreferencesGroup({
            description:
                'Workspaces bar appearance preferences require the indicator style "Workspaces bar".',
        });
        this.page.add(disabledNoticeGroup);
        const updateEnabled = () => {
            const indicatorStyle = this._behaviorSettings.get_string(`indicator-style`);
            const enabled = indicatorStyle === 'workspaces-bar';
            disabledNoticeGroup.set_visible(!enabled);
            for (const group of this._workspacesBarGroups) {
                group.set_sensitive(enabled);
            }
        };
        updateEnabled();
        const changed = this._behaviorSettings.connect(`changed::indicator-style`, updateEnabled);
        this.page.connect('unmap', () => this._behaviorSettings.disconnect(changed));
    }

    private _initGeneralGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('General');
        this._workspacesBarGroups.push(group);
        addSpinButton({
            settings: this._settings,
            group,
            key: 'workspaces-bar-padding',
            title: 'Workspaces-bar padding',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'workspace-margin',
            title: 'Workspace margin',
            lower: 0,
            upper: 255,
        }).addResetButton({ window: this.window });
        this.page.add(group);
    }

    private _initActiveWorkspaceGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Active Workspace');
        this._workspacesBarGroups.push(group);
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-text-color',
            title: 'Text color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'active-workspace-border-color',
            title: 'Border color',
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'active-workspace-font-size',
            title: 'Font size',
            lower: 0,
            upper: 255,
        }).addToggleButton({ window: this.window });
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
            key: 'active-workspace-border-width',
            title: 'Border width',
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
        this._workspacesBarGroups.push(group);
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-text-color',
            title: 'Text color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'inactive-workspace-border-color',
            title: 'Border color',
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'inactive-workspace-font-size',
            title: 'Font size',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-font-size',
        });
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
            key: 'inactive-workspace-border-width',
            title: 'Border width',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'active-workspace-border-width',
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

    private _initEmptyWorkspaceGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Empty Workspace');
        this._workspacesBarGroups.push(group);
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'empty-workspace-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'empty-workspace-text-color',
            title: 'Text color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'empty-workspace-border-color',
            title: 'Border color',
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'empty-workspace-font-size',
            title: 'Font size',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-font-size',
        });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'empty-workspace-font-weight',
            title: 'Font weight',
            options: fontWeightOptions,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-font-weight',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'empty-workspace-border-radius',
            title: 'Border radius',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-border-radius',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'empty-workspace-border-width',
            title: 'Border width',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-border-width',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'empty-workspace-padding-h',
            title: 'Horizontal padding',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-padding-h',
        });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'empty-workspace-padding-v',
            title: 'Vertical padding',
            lower: 0,
            upper: 255,
        }).linkValue({
            window: this.window,
            linkedKey: 'inactive-workspace-padding-v',
        });
        this.page.add(group);
    }

    private _initOverlayGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Workspace Overlay');
        addCombo({
            window: this.window,
            settings: this._behaviorSettings,
            group,
            key: 'overlay-style-preset',
            title: 'Style preset',
            options: overlayStylePresetOptions,
        });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'overlay-background-color',
            title: 'Background color',
        }).addResetButton({ window: this.window });
        addColorButton({
            window: this.window,
            settings: this._settings,
            group,
            key: 'overlay-text-color',
            title: 'Text color',
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'overlay-font-size',
            title: 'Font size',
            lower: 8,
            upper: 96,
        }).addResetButton({ window: this.window });
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'overlay-font-weight',
            title: 'Font weight',
            options: fontWeightOptions,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'overlay-border-radius',
            title: 'Border radius',
            lower: 0,
            upper: 50,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'overlay-padding-h',
            title: 'Horizontal padding',
            lower: 0,
            upper: 100,
        }).addResetButton({ window: this.window });
        addSpinButton({
            settings: this._settings,
            group,
            key: 'overlay-padding-v',
            title: 'Vertical padding',
            lower: 0,
            upper: 100,
        }).addResetButton({ window: this.window });
        this._connectOverlayPresetLogic(group);
        this.page.add(group);
    }

    private _connectOverlayPresetLogic(group: Adw.PreferencesGroup): void {
        const appearanceKeys = [
            'overlay-background-color',
            'overlay-text-color',
            'overlay-font-size',
            'overlay-font-weight',
            'overlay-border-radius',
            'overlay-padding-v',
            'overlay-padding-h',
        ] as const;

        let applyingPreset = false;

        // When preset changes, apply preset values
        const applyPreset = () => {
            const preset = this._behaviorSettings.get_string('overlay-style-preset');
            if (!preset || preset === 'custom' || !(preset in overlayPresets)) return;
            const values = overlayPresets[preset];
            applyingPreset = true;
            for (const key of appearanceKeys) {
                const value = values[key];
                if (typeof value === 'string') {
                    this._settings.set_string(key, value);
                } else {
                    this._settings.set_int(key, value);
                }
            }
            applyingPreset = false;
        };

        const presetChanged = this._behaviorSettings.connect(
            'changed::overlay-style-preset',
            applyPreset,
        );
        this.page.connect('unmap', () => this._behaviorSettings.disconnect(presetChanged));

        // When any appearance setting changes, detect custom
        const detectCustom = () => {
            if (applyingPreset) return;
            const currentPreset = this._behaviorSettings.get_string('overlay-style-preset');
            if (currentPreset === 'custom') return;
            if (currentPreset && currentPreset in overlayPresets) {
                const values = overlayPresets[currentPreset];
                for (const key of appearanceKeys) {
                    const expected = values[key];
                    if (typeof expected === 'string') {
                        if (this._settings.get_string(key) !== expected) {
                            this._behaviorSettings.set_string('overlay-style-preset', 'custom');
                            return;
                        }
                    } else {
                        if (this._settings.get_int(key) !== expected) {
                            this._behaviorSettings.set_string('overlay-style-preset', 'custom');
                            return;
                        }
                    }
                }
            }
        };

        const changedIds: number[] = [];
        for (const key of appearanceKeys) {
            changedIds.push(this._settings.connect(`changed::${key}`, detectCustom));
        }
        this.page.connect('unmap', () => {
            for (const id of changedIds) {
                this._settings.disconnect(id);
            }
        });
    }

    private _initCustomStylesGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Custom Styles');
        this._workspacesBarGroups.push(group);
        addCustomCssDialogButton({
            window: this.window,
            group,
            settings: this._settings,
        });
        this.page.add(group);
    }
}
