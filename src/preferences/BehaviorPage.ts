import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { addCombo, addLinkButton, addSpinButton, addTextEntry, addToggle } from './common';

export const indicatorStyleOptions = {
    'current-workspace': 'Current workspace',
    'workspaces-bar': 'Workspaces bar',
};

export const scrollWheelOptions = {
    panel: 'Over top panel',
    'workspaces-bar': 'Over indicator',
    disabled: 'Disabled',
};

export const scrollWheelDirectionOptions = {
    normal: 'Normal',
    inverted: 'Inverted',
    disabled: 'Disabled',
};

export const positionOptions = {
    left: 'Left',
    center: 'Center',
    right: 'Right',
};

export const overlayScreenOptions = {
    primary: 'Primary screen',
    all: 'All screens',
};

export const overlayStylePresetOptions = {
    default: 'Default',
    minimal: 'Minimal',
    large: 'Large',
    glass: 'Glass',
    accent: 'Accent',
    custom: 'Custom',
};

export interface OverlayPresetValues {
    'overlay-background-color': string;
    'overlay-text-color': string;
    'overlay-font-size': number;
    'overlay-font-weight': string;
    'overlay-border-radius': number;
    'overlay-padding-v': number;
    'overlay-padding-h': number;
}

export const overlayPresets: Record<string, OverlayPresetValues> = {
    default: {
        'overlay-background-color': 'rgba(0, 0, 0, 0.75)',
        'overlay-text-color': 'rgba(255, 255, 255, 1)',
        'overlay-font-size': 48,
        'overlay-font-weight': '700',
        'overlay-border-radius': 16,
        'overlay-padding-v': 24,
        'overlay-padding-h': 48,
    },
    minimal: {
        'overlay-background-color': 'rgba(0, 0, 0, 0.6)',
        'overlay-text-color': 'rgba(255, 255, 255, 0.9)',
        'overlay-font-size': 32,
        'overlay-font-weight': '400',
        'overlay-border-radius': 8,
        'overlay-padding-v': 12,
        'overlay-padding-h': 24,
    },
    large: {
        'overlay-background-color': 'rgba(0, 0, 0, 0.85)',
        'overlay-text-color': 'rgba(255, 255, 255, 1)',
        'overlay-font-size': 72,
        'overlay-font-weight': '700',
        'overlay-border-radius': 24,
        'overlay-padding-v': 36,
        'overlay-padding-h': 72,
    },
    glass: {
        'overlay-background-color': 'rgba(255, 255, 255, 0.15)',
        'overlay-text-color': 'rgba(255, 255, 255, 1)',
        'overlay-font-size': 48,
        'overlay-font-weight': '300',
        'overlay-border-radius': 20,
        'overlay-padding-v': 24,
        'overlay-padding-h': 48,
    },
    accent: {
        'overlay-background-color': 'rgba(53, 132, 228, 0.85)',
        'overlay-text-color': 'rgba(255, 255, 255, 1)',
        'overlay-font-size': 48,
        'overlay-font-weight': '700',
        'overlay-border-radius': 16,
        'overlay-padding-v': 24,
        'overlay-padding-h': 48,
    },
};

export class BehaviorPage {
    window!: Adw.PreferencesWindow;
    readonly page = new Adw.PreferencesPage();
    private readonly _settings: Gio.Settings;
    private readonly _appearanceSettings: Gio.Settings;

    constructor(extensionPreferences: any) {
        this._settings = extensionPreferences.getSettings(
            `org.gnome.shell.extensions.space-bar.behavior`,
        );
        this._appearanceSettings = extensionPreferences.getSettings(
            `org.gnome.shell.extensions.space-bar.appearance`,
        );
    }

    init() {
        this.page.set_title('_Behavior');
        this.page.useUnderline = true;
        this.page.set_icon_name('preferences-system-symbolic');
        this._initGeneralGroup();
        this._initOverlayGroup();
        this._initSmartWorkspaceNamesGroup();
    }

    private _initGeneralGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('General');
        addCombo({
            window: this.window,
            settings: this._settings,
            group,
            key: 'indicator-style',
            title: 'Indicator style',
            options: indicatorStyleOptions,
        }).addSubDialog({
            window: this.window,
            title: 'Indicator style',
            populatePage: (page) => {
                const group = new Adw.PreferencesGroup();
                group.set_title('Custom label text');
                group.set_description(
                    'Custom labels to use for workspace names in the top panel. The following placeholders will be replaced with their respective value:\n\n' +
                        '{{name}}: The current workspace name\n' +
                        '{{number}}: The current workspace number\n' +
                        '{{total}}: The number of total workspaces\n' +
                        '{{Total}}: The number of total workspaces, also counting the spare dynamic workspace',
                );
                page.add(group);
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'enable-custom-label',
                    title: 'Use custom label text',
                });
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'enable-custom-label-in-menu',
                    title: 'Also use custom label text in menu',
                }).enableIf({
                    key: 'enable-custom-label',
                    predicate: (value) => value.get_boolean(),
                    page,
                });
                addTextEntry({
                    settings: this._settings,
                    group,
                    key: 'custom-label-named',
                    title: 'Custom label for named workspaces',
                    window: this.window,
                }).enableIf({
                    key: 'enable-custom-label',
                    predicate: (value) => value.get_boolean(),
                    page,
                });
                addTextEntry({
                    settings: this._settings,
                    group,
                    key: 'custom-label-unnamed',
                    title: 'Custom label for unnamed workspaces',
                    window: this.window,
                }).enableIf({
                    key: 'enable-custom-label',
                    predicate: (value) => value.get_boolean(),
                    page,
                });
            },
        });
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
                addToggle({
                    settings: this._settings,
                    group: positionSubDialogGroup,
                    key: 'system-workspace-indicator',
                    title: 'Keep system workspace indicator',
                });
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
                addCombo({
                    window: this.window,
                    settings: this._settings,
                    group,
                    key: 'scroll-wheel-vertical',
                    title: 'Vertical scrolling',
                    options: scrollWheelDirectionOptions,
                });
                addCombo({
                    window: this.window,
                    settings: this._settings,
                    group,
                    key: 'scroll-wheel-horizontal',
                    title: 'Horizontal scrolling',
                    options: scrollWheelDirectionOptions,
                });
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'scroll-wheel-wrap-around',
                    title: 'Wrap around',
                });
            },
        });
        addToggle({
            settings: this._settings,
            group,
            key: 'always-show-numbers',
            title: 'Always show workspace numbers',
        });
        addToggle({
            settings: this._settings,
            group,
            key: 'show-empty-workspaces',
            title: 'Show empty workspaces',
            subtitle: 'Also affects switching with scroll wheel',
        });
        addToggle({
            settings: this._settings,
            group,
            key: 'toggle-overview',
            title: 'Toggle overview',
            subtitle: 'When clicking on the active or an empty workspace',
        });
        this.page.add(group);
    }

    private _initOverlayGroup(): void {
        const group = new Adw.PreferencesGroup();
        group.set_title('Workspace Overlay');
        group.set_description(
            'Show a centered overlay when switching workspaces.',
        );
        addToggle({
            settings: this._settings,
            group,
            key: 'overlay-enabled',
            title: 'Enable workspace overlay',
        }).addSubDialog({
            window: this.window,
            title: 'Workspace Overlay',
            enableIf: {
                key: 'overlay-enabled',
                predicate: (value) => value.get_boolean(),
                page: this.page,
            },
            populatePage: (page) => {
                const group = new Adw.PreferencesGroup();
                page.add(group);
                addSpinButton({
                    settings: this._settings,
                    group,
                    key: 'overlay-display-time',
                    title: 'Display time (ms)',
                    subtitle: 'How long the overlay is shown',
                    lower: 100,
                    upper: 5000,
                    step: 100,
                });
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'overlay-show-workspace-name',
                    title: 'Show workspace name',
                    subtitle: 'Use workspace display name instead of just the number',
                });
                addCombo({
                    window: this.window,
                    settings: this._settings,
                    group,
                    key: 'overlay-screen',
                    title: 'Show on',
                    options: overlayScreenOptions,
                });
                addCombo({
                    window: this.window,
                    settings: this._settings,
                    group,
                    key: 'overlay-style-preset',
                    title: 'Style',
                    options: overlayStylePresetOptions,
                });
                const hintGroup = new Adw.PreferencesGroup();
                page.add(hintGroup);
                const hintRow = new Adw.ActionRow({
                    title: 'Customize overlay appearance',
                    subtitle: 'Adjust colors, font, padding, and more',
                    activatable: true,
                });
                hintRow.add_suffix(new Gtk.Image({
                    iconName: 'go-next-symbolic',
                }));
                hintRow.connect('activated', () => {
                    const dialog = hintRow.get_root() as Gtk.Window;
                    dialog.close();
                    this.window.set_visible_page_name('appearance');
                });
                hintGroup.add(hintRow);
                this._connectPresetLogic(page);
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
        }).addSubDialog({
            window: this.window,
            title: 'Smart Workspace Names',
            enableIf: {
                key: 'smart-workspace-names',
                predicate: (value) => value.get_boolean(),
                page: this.page,
            },
            iconName: 'applications-science-symbolic',
            populatePage: (page) => {
                const group = new Adw.PreferencesGroup();
                page.add(group);
                group.set_title('Re-evaluate names');
                group.set_description(
                    'Removes workspace names when windows by which the name was assigned move away or close.\n\n' +
                        'Please leave feedback how you like the feature using the button below.',
                );
                addToggle({
                    settings: this._settings,
                    group,
                    key: 'reevaluate-smart-workspace-names',
                    title: 'Re-evaluate smart workspace names',
                });
                addLinkButton({
                    title: 'Leave feedback',
                    uri: 'https://github.com/christopher-l/space-bar/issues/37',
                    group,
                });
            },
        });
        this.page.add(group);
    }

    private _connectPresetLogic(page: Adw.PreferencesPage): void {
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

        // When preset changes, apply preset values to appearance settings
        const applyPreset = () => {
            const preset = this._settings.get_string('overlay-style-preset');
            if (!preset || preset === 'custom' || !(preset in overlayPresets)) return;
            const values = overlayPresets[preset];
            applyingPreset = true;
            for (const key of appearanceKeys) {
                const value = values[key];
                if (typeof value === 'string') {
                    this._appearanceSettings.set_string(key, value);
                } else {
                    this._appearanceSettings.set_int(key, value);
                }
            }
            applyingPreset = false;
        };

        const presetChanged = this._settings.connect(
            'changed::overlay-style-preset',
            applyPreset,
        );
        page.connect('unmap', () => this._settings.disconnect(presetChanged));

        // When any appearance setting changes, detect if it still matches a preset
        const detectCustom = () => {
            if (applyingPreset) return;
            const currentPreset = this._settings.get_string('overlay-style-preset');
            if (currentPreset === 'custom') return;
            if (currentPreset && currentPreset in overlayPresets) {
                const values = overlayPresets[currentPreset];
                for (const key of appearanceKeys) {
                    const expected = values[key];
                    if (typeof expected === 'string') {
                        if (this._appearanceSettings.get_string(key) !== expected) {
                            this._settings.set_string('overlay-style-preset', 'custom');
                            return;
                        }
                    } else {
                        if (this._appearanceSettings.get_int(key) !== expected) {
                            this._settings.set_string('overlay-style-preset', 'custom');
                            return;
                        }
                    }
                }
            }
        };

        const changedIds: number[] = [];
        for (const key of appearanceKeys) {
            changedIds.push(
                this._appearanceSettings.connect(`changed::${key}`, detectCustom),
            );
        }
        page.connect('unmap', () => {
            for (const id of changedIds) {
                this._appearanceSettings.disconnect(id);
            }
        });
    }
}
