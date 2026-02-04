import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

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

const OVERLAY_APPEARANCE_KEYS = [
    'overlay-background-color',
    'overlay-text-color',
    'overlay-font-size',
    'overlay-font-weight',
    'overlay-border-radius',
    'overlay-padding-v',
    'overlay-padding-h',
] as const;

export function connectOverlayPresetLogic(params: {
    behaviorSettings: Gio.Settings;
    appearanceSettings: Gio.Settings;
    disconnectOn: Gtk.Widget;
}): void {
    const { behaviorSettings, appearanceSettings, disconnectOn } = params;

    let applyingPreset = false;

    // When preset changes, apply preset values to appearance settings
    const applyPreset = () => {
        const preset = behaviorSettings.get_string('overlay-style-preset');
        if (!preset || preset === 'custom' || !(preset in overlayPresets)) return;
        const values = overlayPresets[preset];
        applyingPreset = true;
        for (const key of OVERLAY_APPEARANCE_KEYS) {
            const value = values[key];
            if (typeof value === 'string') {
                appearanceSettings.set_string(key, value);
            } else {
                appearanceSettings.set_int(key, value);
            }
        }
        applyingPreset = false;
    };

    const presetChanged = behaviorSettings.connect('changed::overlay-style-preset', applyPreset);
    disconnectOn.connect('unmap', () => behaviorSettings.disconnect(presetChanged));

    // When any appearance setting changes, detect if it no longer matches the active preset
    const detectCustom = () => {
        if (applyingPreset) return;
        const currentPreset = behaviorSettings.get_string('overlay-style-preset');
        if (currentPreset === 'custom') return;
        if (currentPreset && currentPreset in overlayPresets) {
            const values = overlayPresets[currentPreset];
            for (const key of OVERLAY_APPEARANCE_KEYS) {
                const expected = values[key];
                if (typeof expected === 'string') {
                    if (appearanceSettings.get_string(key) !== expected) {
                        behaviorSettings.set_string('overlay-style-preset', 'custom');
                        return;
                    }
                } else {
                    if (appearanceSettings.get_int(key) !== expected) {
                        behaviorSettings.set_string('overlay-style-preset', 'custom');
                        return;
                    }
                }
            }
        }
    };

    const changedIds: number[] = [];
    for (const key of OVERLAY_APPEARANCE_KEYS) {
        changedIds.push(appearanceSettings.connect(`changed::${key}`, detectCustom));
    }
    disconnectOn.connect('unmap', () => {
        for (const id of changedIds) {
            appearanceSettings.disconnect(id);
        }
    });
}
