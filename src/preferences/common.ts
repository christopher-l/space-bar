import { Adw, Gdk, Gio, GObject, Gtk } from 'imports/gi';
import { DropDownChoice, DropDownChoiceClass } from 'preferences/DropDownChoice';

class PreferencesRow {
    constructor(
        private readonly _settings: Gio.Settings,
        private readonly _row: Adw.ActionRow,
        private readonly _key: string,
        private readonly _setEnabledInner?: (value: boolean) => void,
    ) {}

    addResetButton({ window }: { window: Adw.PreferencesWindow }): void {
        const button = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            has_frame: false,
            margin_start: 10,
        });
        button.connect('clicked', () => this._settings.reset(this._key));
        const updateButton = () => {
            const buttonEnabled = this._settings.get_user_value(this._key) !== null;
            button.set_sensitive(buttonEnabled);
        };
        updateButton();
        const changed = this._settings.connect(`changed::${this._key}`, updateButton);
        window.connect('unmap', () => this._settings.disconnect(changed));
        this._row.add_suffix(button);
    }

    linkValue({
        linkedKey,
        activeKey = this._key + '-active',
        window,
    }: {
        linkedKey: string;
        activeKey?: string;
        window: Adw.PreferencesWindow;
    }): void {
        const toggleEdit = (active: boolean) => {
            this._settings.set_boolean(activeKey, active);
            updateRow();
            updateLinkedValue();
        };
        const updateRow = () => {
            const active = this._settings.get_boolean(activeKey);
            this._setEnabled(active);
        };
        const updateLinkedValue = () => {
            const active = this._settings.get_boolean(activeKey);
            if (!active) {
                const linkedValue = this._settings.get_user_value(linkedKey);
                if (linkedValue) {
                    this._settings.set_value(this._key, linkedValue);
                } else {
                    this._settings.reset(this._key);
                }
            }
        };
        const changed = this._settings.connect(`changed::${linkedKey}`, updateLinkedValue);
        window.connect('unmap', () => this._settings.disconnect(changed));
        updateRow();
        const button = new Gtk.ToggleButton({
            icon_name: 'document-edit-symbolic',
            valign: Gtk.Align.CENTER,
            has_frame: false,
            margin_start: 10,
        });
        button.connect('toggled', (toggle: Gtk.ToggleButton) => toggleEdit(toggle.active));
        this._row.add_suffix(button);
    }

    addSubDialog({
        window,
        title,
        populatePage,
    }: {
        window: Adw.PreferencesWindow;
        title: string;
        populatePage: (page: Adw.PreferencesPage) => void;
    }): void {
        function showDialog() {
            const dialog = new Gtk.Dialog({
                title,
                modal: true,
                use_header_bar: 1,
                transient_for: window,
                width_request: 350,
                default_width: 500,
            });
            const page = new Adw.PreferencesPage();
            populatePage(page);
            dialog.set_child(page);
            dialog.show();
        }
        const button = new Gtk.Button({
            icon_name: 'settings-symbolic',
            valign: Gtk.Align.CENTER,
            has_frame: false,
            margin_start: 10,
        });
        button.connect('clicked', () => showDialog());
        this._row.add_suffix(button);
    }

    private _setEnabled(value: boolean): void {
        this._setEnabledInner?.(value);
    }
}

export function addToggle({
    group,
    key,
    title,
    subtitle = null,
    settings,
    shortcutLabel,
}: {
    group: Adw.PreferencesGroup;
    key: string;
    title: string;
    subtitle?: string | null;
    settings: Gio.Settings;
    shortcutLabel?: string | null;
}): PreferencesRow {
    const row = new Adw.ActionRow({ title, subtitle });
    group.add(row);

    if (shortcutLabel) {
        const gtkShortcutLabel = new Gtk.ShortcutLabel({
            accelerator: shortcutLabel,
            valign: Gtk.Align.CENTER,
        });
        row.add_prefix(gtkShortcutLabel);
    }

    const toggle = new Gtk.Switch({
        active: settings.get_boolean(key),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(key, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    return new PreferencesRow(settings, row, key, (enabled) => toggle.set_sensitive(enabled));
}

export function addTextEntry({
    group,
    key,
    title,
    subtitle = null,
    settings,
    window,
    shortcutLabel,
}: {
    group: Adw.PreferencesGroup;
    key: string;
    title: string;
    subtitle?: string | null;
    settings: Gio.Settings;
    window: Adw.PreferencesWindow;
    shortcutLabel?: string | null;
}): PreferencesRow {
    const row = new Adw.ActionRow({ title, subtitle });
    group.add(row);

    if (shortcutLabel) {
        const gtkShortcutLabel = new Gtk.ShortcutLabel({
            accelerator: shortcutLabel,
            valign: Gtk.Align.CENTER,
        });
        row.add_prefix(gtkShortcutLabel);
    }

    const entry = new Gtk.Entry({
        text: settings.get_string(key),
        valign: Gtk.Align.CENTER,
    });
    const focusController = new Gtk.EventControllerFocus();
    focusController.connect('leave', () => {
        settings.set_string(key, entry.get_buffer().text);
    });
    entry.add_controller(focusController);
    const changed = settings.connect(`changed::${key}`, () => {
        entry.set_text(settings.get_string(key));
    });
    window.connect('unmap', () => settings.disconnect(changed));

    row.add_suffix(entry);
    row.activatable_widget = entry;
    return new PreferencesRow(settings, row, key, (enabled) => entry.set_sensitive(enabled));
}

export function addCombo({
    group,
    key,
    title,
    subtitle = null,
    options,
    settings,
    window,
}: {
    group: Adw.PreferencesGroup;
    key: string;
    title: string;
    subtitle?: string | null;
    options: { [key: string]: string };
    settings: Gio.Settings;
    window: Adw.PreferencesWindow;
}): PreferencesRow {
    const model = Gio.ListStore.new(DropDownChoice);
    for (const id in options) {
        model.append(new DropDownChoice({ id, title: options[id] }));
    }
    const row = new Adw.ComboRow({
        title,
        subtitle,
        model,
        expression: Gtk.PropertyExpression.new(DropDownChoice, null, 'title'),
    });
    group.add(row);
    row.connect('notify::selected-item', () => {
        // This may trigger without user interaction, so we only update the value when it differs
        // from the the default value or a user value has been set before.
        const value = (row.selected_item as DropDownChoiceClass).id;
        if (settings.get_user_value(key) !== null || settings.get_string(key) !== value) {
            settings.set_string(key, value);
        }
    });
    function updateComboRowState() {
        row.selected =
            findItemPositionInModel<DropDownChoiceClass>(
                model,
                (item) => item.id === settings.get_string(key),
            ) ?? Gtk.INVALID_LIST_POSITION;
    }
    const changed = settings.connect(`changed::${key}`, () => updateComboRowState());
    window.connect('unmap', () => settings.disconnect(changed));
    updateComboRowState();

    const suffixes = row.get_first_child()?.get_last_child();
    const comboBoxElements = [suffixes?.get_first_child(), suffixes?.get_last_child()];
    return new PreferencesRow(settings, row, key, (enabled) => {
        row.set_activatable(enabled);
        const opacity = enabled ? 1 : 0.5;
        comboBoxElements.forEach((el) => el?.set_opacity(opacity));
    });
}

export function addSpinButton({
    group,
    key,
    title,
    subtitle = null,
    settings,
    lower,
    upper,
    step = 1,
}: {
    group: Adw.PreferencesGroup;
    key: string;
    title: string;
    subtitle?: string | null;
    settings: Gio.Settings;
    lower: number;
    upper: number;
    step?: number | null;
}): PreferencesRow {
    const row = new Adw.ActionRow({ title, subtitle });
    group.add(row);

    const spinner = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            step_increment: step ?? 1,
            lower,
            upper,
        }),
        value: settings.get_int(key),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.CENTER,
    });

    settings.bind(key, spinner, 'value', Gio.SettingsBindFlags.DEFAULT);

    row.add_suffix(spinner);
    row.activatable_widget = spinner;
    return new PreferencesRow(settings, row, key, (enabled) => {
        spinner.set_sensitive(enabled);
    });
}

export function addKeyboardShortcut({
    window,
    group,
    key,
    title,
    subtitle = null,
    settings,
}: {
    window: Adw.PreferencesWindow;
    group: Adw.PreferencesGroup;
    key: string;
    title: string;
    subtitle?: string | null;
    settings: Gio.Settings;
}): void {
    const row = new Adw.ActionRow({
        title,
        subtitle,
        activatable: true,
    });
    group.add(row);

    const shortcutLabel = new Gtk.ShortcutLabel({
        accelerator: settings.get_strv(key)[0] ?? null,
        valign: Gtk.Align.CENTER,
    });
    row.add_suffix(shortcutLabel);
    const disabledLabel = new Gtk.Label({
        label: 'Disabled',
        css_classes: ['dim-label'],
    });
    row.add_suffix(disabledLabel);
    if (settings.get_strv(key).length > 0) {
        disabledLabel.hide();
    } else {
        shortcutLabel.hide();
    }

    function showDialog(): void {
        const dialog = new Gtk.Dialog({
            title: 'Set Shortcut',
            modal: true,
            use_header_bar: 1,
            transient_for: window,
            width_request: 400,
            height_request: 200,
        });
        const dialogBox = new Gtk.Box({
            margin_bottom: 12,
            margin_end: 12,
            margin_start: 12,
            margin_top: 12,
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.CENTER,
        });
        const dialogLabel = new Gtk.Label({
            label: 'Enter new shortcut to change <b>' + title + '</b>.',
            use_markup: true,
            margin_bottom: 12,
        });
        dialogBox.append(dialogLabel);
        const dialogDimLabel = new Gtk.Label({
            label: 'Press Esc to cancel or Backspace to disable the keyboard shortcut.',
            css_classes: ['dim-label'],
        });
        dialogBox.append(dialogDimLabel);
        const keyController = new Gtk.EventControllerKey({
            propagation_phase: Gtk.PropagationPhase.CAPTURE,
        });
        dialog.add_controller(keyController);
        keyController.connect('key-pressed', (keyController, keyval, keycode, modifier) => {
            const accelerator = getAccelerator(keyval, modifier);
            if (accelerator) {
                if (keyval === Gdk.KEY_Escape && !modifier) {
                    // Just close the dialog
                } else if (keyval === Gdk.KEY_BackSpace && !modifier) {
                    shortcutLabel.hide();
                    disabledLabel.show();
                    settings.set_strv(key, []);
                } else {
                    shortcutLabel.accelerator = accelerator;
                    shortcutLabel.show();
                    disabledLabel.hide();
                    settings.set_strv(key, [accelerator]);
                }
                dialog.close();
            }
        });
        dialog.set_child(dialogBox);
        dialog.show();
    }

    row.connect('activated', () => showDialog());
}

function getAccelerator(keyval: number, modifiers: number): string | null {
    const acceleratorName = Gtk.accelerator_name(keyval, modifiers);
    const isValid = Gtk.accelerator_valid(keyval, modifiers);
    if (isValid) {
        return acceleratorName;
    } else {
        return null;
    }
}

// From https://gitlab.com/rmnvgr/nightthemeswitcher-gnome-shell-extension/-/blob/main/src/utils.js
function findItemPositionInModel<T extends GObject.Object>(
    model: Gio.ListModel,
    predicate: (item: T) => boolean,
): number | undefined {
    for (let i = 0; i < model.get_n_items(); i++) {
        if (predicate(model.get_item(i) as T)) {
            return i;
        }
    }
    return undefined;
}
