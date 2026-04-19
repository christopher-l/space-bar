import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Settings } from './Settings.js';
import { Workspaces } from './Workspaces.js';

interface SystemBinding {
    schema: string;
    key: string;
    value: string[];
    default: boolean;
}

export class KeyBindings {
    private static _instance: KeyBindings | null;

    static init() {
        KeyBindings._instance = new KeyBindings();
        KeyBindings._instance.init();
    }

    static destroy() {
        KeyBindings._instance?.destroy();
        KeyBindings._instance = null;
    }

    static getInstance(): KeyBindings {
        return KeyBindings._instance as KeyBindings;
    }

    private readonly _settings = Settings.getInstance();
    private readonly _ws = Workspaces.getInstance();
    private readonly _desktopKeybindings = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.keybindings',
    });
    private readonly _systemBindingSettings = [
        this._desktopKeybindings,
        new Gio.Settings({ schema: 'org.gnome.shell.keybindings' }),
        new Gio.Settings({ schema: 'org.gnome.settings-daemon.plugins.media-keys' }),
    ];
    private _addedKeyBindings: string[] = [];
    private _replacedSystemBindings: { [name in string]?: SystemBinding } = {};

    init() {
        this._registerActivateByNumber();
        this._registerMoveToByNumber();
        this._addExtensionKeyBindings();
        KeyBindings._instance = this;
    }

    destroy() {
        for (const name of this._addedKeyBindings) {
            Main.wm.removeKeybinding(name);
        }
        this._addedKeyBindings = [];
        for (const shortcutName in this._replacedSystemBindings) {
            this._restoreSystemBinding(shortcutName);
        }
    }

    addKeyBinding(name: string, handler: () => void) {
        Shell.ActionMode;
        Main.wm.addKeybinding(
            name,
            this._settings.shortcutsSettings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            handler,
        );
        this._addedKeyBindings.push(name);
    }

    removeKeybinding(name: string) {
        if (this._addedKeyBindings.includes(name)) {
            Main.wm.removeKeybinding(name);
            this._addedKeyBindings.splice(this._addedKeyBindings.indexOf(name), 1);
        }
    }

    private _addExtensionKeyBindings() {
        this.addKeyBinding('move-workspace-left', () => this._ws.moveCurrentWorkspace(-1));
        this.addKeyBinding('move-workspace-right', () => this._ws.moveCurrentWorkspace(1));
        this.addKeyBinding('activate-previous-key', () => this._ws.activatePrevious());
        this.addKeyBinding('activate-empty-key', () => this._ws.activateEmptyOrAdd());
    }

    private _registerActivateByNumber(): void {
        this._settings.enableActivateWorkspaceShortcuts.subscribe(
            (value) => {
                for (let i = 0; i < 10; i++) {
                    const name = `activate-${i + 1}-key`;
                    if (value) {
                        this._replaceConflictingSystemBinding(name);
                        this.addKeyBinding(name, () => {
                            this._ws.switchTo(i, 'keyboard-shortcut');
                        });
                    } else {
                        this.removeKeybinding(name);
                        this._restoreSystemBinding(name);
                    }
                }
            },
            { emitCurrentValue: true },
        );
    }

    private _registerMoveToByNumber(): void {
        this._settings.enableMoveToWorkspaceShortcuts.subscribe((value) => {
            for (let i = 0; i < 10; i++) {
                const name = `move-to-workspace-${i + 1}`;
                if (value) {
                    this._desktopKeybindings.set_strv(name, [`<Super><Shift>${(i + 1) % 10}`]);
                } else {
                    this._desktopKeybindings.reset(name);
                }
            }
        });
    }

    /**
     * Searches for system keybindings that conflict with an extension shortcut and replace it.
     *
     * Considers only the first shortcut binding of the extension shortcut and replaces only the
     * first conflicting system binding found.
     *
     * If it replaces a system binding, it adds it to _replacedSystemBindings.
     */
    private _replaceConflictingSystemBinding(shortcutName: string) {
        const binding = this._settings.shortcutsSettings.get_strv(shortcutName)[0];
        if (!binding) {
            return null;
        }
        for (const settings of this._systemBindingSettings) {
            for (const key of settings.list_keys()) {
                const variant = settings.get_value(key);
                if (variant.get_type_string() === 'as') {
                    const value = variant.get_strv();
                    if (value.includes(binding)) {
                        this._replacedSystemBindings[shortcutName] = {
                            schema: settings.schema_id,
                            key,
                            value,
                            default: settings.get_user_value(key) == null,
                        };
                        settings.set_strv(
                            key,
                            value.filter((v) => v !== binding),
                        );
                        return;
                    }
                }
            }
        }
    }

    /**
     * Restores a system keybinding that has been replaced by this extension.
     */
    private _restoreSystemBinding(shortcutName: string) {
        if (this._replacedSystemBindings[shortcutName]) {
            const r = this._replacedSystemBindings[shortcutName];
            const settings = new Gio.Settings({ schema_id: r.schema });
            if (r.default) {
                settings.reset(r.key);
            } else {
                settings.set_strv(r.key, r.value);
            }
            delete this._replacedSystemBindings[shortcutName];
        }
    }
}
