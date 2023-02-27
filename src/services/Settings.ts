const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
import { Gio } from 'imports/gi';
import { scrollWheelOptions, positionOptions } from 'preferences/BehaviorPage';

export class Settings {
    private static _instance: Settings | null;
    static init() {
        Settings._instance = new Settings();
        Settings._instance.init();
    }
    static destroy() {
        Settings._instance?.destroy();
        Settings._instance = null;
    }
    static getInstance(): Settings {
        return Settings._instance as Settings;
    }

    readonly state = ExtensionUtils.getSettings(`${Me.metadata['settings-schema']}.state`);
    readonly behaviorSettings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.behavior`,
    );
    readonly shortcutsSettings = ExtensionUtils.getSettings(
        `${Me.metadata['settings-schema']}.shortcuts`,
    );
    readonly mutterSettings = new Gio.Settings({ schema: 'org.gnome.mutter' });
    readonly wmPreferencesSettings = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.preferences',
    });

    readonly workspaceNamesMap = SettingsSubject.createJsonObjectSubject<{
        [windowName: string]: string[];
    }>(this.state, 'workspace-names-map');
    readonly dynamicWorkspaces = SettingsSubject.createBooleanSubject(
        this.mutterSettings,
        'dynamic-workspaces',
    );
    readonly showEmptyWorkspaces = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'show-empty-workspaces',
    );
    readonly scrollWheel = SettingsSubject.createStringSubject<keyof typeof scrollWheelOptions>(
        this.behaviorSettings,
        'scroll-wheel',
    );
    readonly smartWorkspaceNames = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'smart-workspace-names',
    );
    readonly position = SettingsSubject.createStringSubject<keyof typeof positionOptions>(
        this.behaviorSettings,
        'position',
    );
    readonly enableActivateWorkspaceShortcuts = SettingsSubject.createBooleanSubject(
        this.shortcutsSettings,
        'enable-activate-workspace-shortcuts',
    );
    readonly enableMoveToWorkspaceShortcuts = SettingsSubject.createBooleanSubject(
        this.shortcutsSettings,
        'enable-move-to-workspace-shortcuts',
    );
    readonly workspaceNames = SettingsSubject.createStringArraySubject(
        this.wmPreferencesSettings,
        'workspace-names',
    );

    private init() {
        SettingsSubject.initAll();
    }

    private destroy() {
        SettingsSubject.destroyAll();
    }
}

class SettingsSubject<T> {
    private static _subjects: SettingsSubject<any>[] = [];
    static createBooleanSubject(settings: Gio.Settings, name: string): SettingsSubject<boolean> {
        return new SettingsSubject<boolean>(settings, name, 'boolean');
    }
    static createStringSubject<T extends string = string>(
        settings: Gio.Settings,
        name: string,
    ): SettingsSubject<T> {
        return new SettingsSubject<T>(settings, name, 'string');
    }
    static createStringArraySubject(
        settings: Gio.Settings,
        name: string,
    ): SettingsSubject<string[]> {
        return new SettingsSubject<string[]>(settings, name, 'string-array');
    }
    static createJsonObjectSubject<T>(settings: Gio.Settings, name: string): SettingsSubject<T> {
        return new SettingsSubject<T>(settings, name, 'json-object');
    }
    static initAll() {
        for (const subject of SettingsSubject._subjects) {
            subject._init();
        }
    }
    static destroyAll() {
        for (const subject of SettingsSubject._subjects) {
            subject._destroy();
        }
        SettingsSubject._subjects = [];
    }

    get value() {
        return this._value;
    }
    set value(value: T) {
        this._setValue(value);
    }

    private _value!: T;
    private _subscribers: ((value: T) => void)[] = [];
    private _getValue!: () => T;
    private _setValue!: (value: T) => void;
    private _disconnect!: () => void;

    private constructor(
        private readonly _settings: Gio.Settings,
        private readonly _name: string,
        private readonly _type: 'boolean' | 'string' | 'string-array' | 'json-object',
    ) {
        SettingsSubject._subjects.push(this);
    }

    subscribe(subscriber: (value: T) => void, { emitCurrentValue = false } = {}) {
        this._subscribers.push(subscriber);
        if (emitCurrentValue) {
            subscriber(this._value);
        }
    }

    private _init(): void {
        this._getValue = () => {
            switch (this._type) {
                case 'boolean':
                    return this._settings.get_boolean(this._name) as unknown as T;
                case 'string':
                    return this._settings.get_string(this._name) as unknown as T;
                case 'string-array':
                    return this._settings.get_strv(this._name) as unknown as T;
                case 'json-object':
                    return JSON.parse(this._settings.get_string(this._name)) as unknown as T;
                default:
                    throw new Error('unknown type ' + this._type);
            }
        };
        this._setValue = (value: T) => {
            switch (this._type) {
                case 'boolean':
                    return this._settings.set_boolean(this._name, value as unknown as boolean);
                case 'string':
                    return this._settings.set_string(this._name, value as unknown as string);
                case 'string-array':
                    return this._settings.set_strv(this._name, value as unknown as string[]);
                case 'json-object':
                    return this._settings.set_string(this._name, JSON.stringify(value));
                default:
                    throw new Error('unknown type ' + this._type);
            }
        };
        this._value = this._getValue();
        const changed = this._settings.connect(`changed::${this._name}`, () =>
            this._updateValue(this._getValue()),
        );
        this._disconnect = () => this._settings.disconnect(changed);
    }

    private _destroy(): void {
        this._disconnect();
        this._subscribers = [];
    }

    private _updateValue(value: T) {
        this._value = value;
        this._notifySubscriber();
    }

    private _notifySubscriber(): void {
        for (const subscriber of this._subscribers) {
            subscriber(this._value);
        }
    }
}
