import Gio from 'gi://Gio';
import { fontWeightOptions } from '../preferences/AppearancePage';
import {
    indicatorStyleOptions,
    positionOptions,
    scrollWheelDirectionOptions,
    scrollWheelOptions,
} from '../preferences/BehaviorPage';

export class Settings {
    private static _instance: Settings | null;
    static init(extension: any) {
        Settings._instance = new Settings(extension);
        Settings._instance.init();
    }
    static destroy() {
        Settings._instance?.destroy();
        Settings._instance = null;
    }
    static getInstance(): Settings {
        return Settings._instance as Settings;
    }

    constructor(private _extension: any) {}

    readonly state = this._extension.getSettings(
        `${this._extension.metadata['settings-schema']}.state`,
    );
    readonly behaviorSettings = this._extension.getSettings(
        `${this._extension.metadata['settings-schema']}.behavior`,
    );
    readonly appearanceSettings = this._extension.getSettings(
        `${this._extension.metadata['settings-schema']}.appearance`,
    );
    readonly shortcutsSettings = this._extension.getSettings(
        `${this._extension.metadata['settings-schema']}.shortcuts`,
    );
    readonly mutterSettings = new Gio.Settings({ schema: 'org.gnome.mutter' });
    readonly wmPreferencesSettings = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.preferences',
    });

    private readonly _version = SettingsSubject.createIntSubject(this.state, 'version');
    readonly workspaceNamesMap = SettingsSubject.createJsonObjectSubject<{
        [windowName: string]: string[];
    }>(this.state, 'workspace-names-map');
    readonly dynamicWorkspaces = SettingsSubject.createBooleanSubject(
        this.mutterSettings,
        'dynamic-workspaces',
    );
    readonly indicatorStyle = SettingsSubject.createStringSubject<
        keyof typeof indicatorStyleOptions
    >(this.behaviorSettings, 'indicator-style');
    readonly enableCustomLabel = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'enable-custom-label',
    );
    readonly enableCustomLabelInMenus = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'enable-custom-label-in-menu',
    );
    readonly customLabelNamed = SettingsSubject.createStringSubject(
        this.behaviorSettings,
        'custom-label-named',
    );
    readonly customLabelUnnamed = SettingsSubject.createStringSubject(
        this.behaviorSettings,
        'custom-label-unnamed',
    );
    readonly position = SettingsSubject.createStringSubject<keyof typeof positionOptions>(
        this.behaviorSettings,
        'position',
    );
    readonly systemWorkspaceIndicator = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'system-workspace-indicator',
    );
    readonly positionIndex = SettingsSubject.createIntSubject(
        this.behaviorSettings,
        'position-index',
    );
    readonly scrollWheel = SettingsSubject.createStringSubject<keyof typeof scrollWheelOptions>(
        this.behaviorSettings,
        'scroll-wheel',
    );
    readonly scrollWheelDebounce = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'scroll-wheel-debounce',
    );
    readonly scrollWheelDebounceTime = SettingsSubject.createIntSubject(
        this.behaviorSettings,
        'scroll-wheel-debounce-time',
    );
    readonly scrollWheelVertical = SettingsSubject.createStringSubject<
        keyof typeof scrollWheelDirectionOptions
    >(this.behaviorSettings, 'scroll-wheel-vertical');
    readonly scrollWheelHorizontal = SettingsSubject.createStringSubject<
        keyof typeof scrollWheelDirectionOptions
    >(this.behaviorSettings, 'scroll-wheel-horizontal');
    readonly scrollWheelWrapAround = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'scroll-wheel-wrap-around',
    );
    readonly alwaysShowNumbers = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'always-show-numbers',
    );
    readonly showEmptyWorkspaces = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'show-empty-workspaces',
    );
    readonly toggleOverview = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'toggle-overview',
    );
    readonly smartWorkspaceNames = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'smart-workspace-names',
    );
    readonly reevaluateSmartWorkspaceNames = SettingsSubject.createBooleanSubject(
        this.behaviorSettings,
        'reevaluate-smart-workspace-names',
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
    readonly workspacesBarPadding = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'workspaces-bar-padding',
    );
    readonly workspaceMargin = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'workspace-margin',
    );
    readonly activeWorkspaceBackgroundColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'active-workspace-background-color',
    );
    readonly activeWorkspaceTextColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'active-workspace-text-color',
    );
    readonly activeWorkspaceBorderColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'active-workspace-border-color',
    );
    readonly activeWorkspaceFontSize = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'active-workspace-font-size',
    );
    readonly activeWorkspaceFontWeight = SettingsSubject.createStringSubject<
        keyof typeof fontWeightOptions
    >(this.appearanceSettings, 'active-workspace-font-weight');
    readonly activeWorkspaceBorderRadius = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'active-workspace-border-radius',
    );
    readonly activeWorkspaceBorderWidth = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'active-workspace-border-width',
    );
    readonly activeWorkspacePaddingH = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'active-workspace-padding-h',
    );
    readonly activeWorkspacePaddingV = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'active-workspace-padding-v',
    );
    readonly inactiveWorkspaceBackgroundColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'inactive-workspace-background-color',
    );
    readonly inactiveWorkspaceTextColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'inactive-workspace-text-color',
    );
    readonly inactiveWorkspaceBorderColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'inactive-workspace-border-color',
    );
    readonly inactiveWorkspaceFontSize = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'inactive-workspace-font-size',
    );
    readonly inactiveWorkspaceFontWeight = SettingsSubject.createStringSubject<
        keyof typeof fontWeightOptions
    >(this.appearanceSettings, 'inactive-workspace-font-weight');
    readonly inactiveWorkspaceBorderRadius = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'inactive-workspace-border-radius',
    );
    readonly inactiveWorkspaceBorderWidth = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'inactive-workspace-border-width',
    );
    readonly inactiveWorkspacePaddingH = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'inactive-workspace-padding-h',
    );
    readonly inactiveWorkspacePaddingV = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'inactive-workspace-padding-v',
    );
    readonly emptyWorkspaceBackgroundColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'empty-workspace-background-color',
    );
    readonly emptyWorkspaceTextColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'empty-workspace-text-color',
    );
    readonly emptyWorkspaceBorderColor = SettingsSubject.createStringSubject(
        this.appearanceSettings,
        'empty-workspace-border-color',
    );
    readonly emptyWorkspaceFontSize = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'empty-workspace-font-size',
    );
    readonly emptyWorkspaceFontWeight = SettingsSubject.createStringSubject<
        keyof typeof fontWeightOptions
    >(this.appearanceSettings, 'empty-workspace-font-weight');
    readonly emptyWorkspaceBorderRadius = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'empty-workspace-border-radius',
    );
    readonly emptyWorkspaceBorderWidth = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'empty-workspace-border-width',
    );
    readonly emptyWorkspacePaddingH = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'empty-workspace-padding-h',
    );
    readonly emptyWorkspacePaddingV = SettingsSubject.createIntSubject(
        this.appearanceSettings,
        'empty-workspace-padding-v',
    );

    private init() {
        SettingsSubject.initAll();
        this.runMigrations();
    }

    private destroy() {
        SettingsSubject.destroyAll();
    }

    /**
     * Migrates preferences from previous space-bar versions.
     */
    private runMigrations(): void {
        if (this._version.value < 26) {
            if ((this.indicatorStyle.value as string) === 'current-workspace-name') {
                this.indicatorStyle.value = 'current-workspace';
            }
        }
        this._version.value = this._extension.metadata['version'];
    }
}

class SettingsSubject<T> {
    private static _subjects: SettingsSubject<any>[] = [];
    static createBooleanSubject(settings: Gio.Settings, name: string): SettingsSubject<boolean> {
        return new SettingsSubject<boolean>(settings, name, 'boolean');
    }
    static createIntSubject(settings: Gio.Settings, name: string): SettingsSubject<number> {
        return new SettingsSubject<number>(settings, name, 'int');
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
        private readonly _type: 'boolean' | 'int' | 'string' | 'string-array' | 'json-object',
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
                case 'int':
                    return this._settings.get_int(this._name) as unknown as T;
                case 'string':
                    return this._settings.get_string(this._name) as unknown as T;
                case 'string-array':
                    return this._settings.get_strv(this._name) as unknown as T;
                case 'json-object':
                    return JSON.parse(this._settings.get_string(this._name)!) as unknown as T;
                default:
                    throw new Error('unknown type ' + this._type);
            }
        };
        this._setValue = (value: T) => {
            switch (this._type) {
                case 'boolean':
                    return this._settings.set_boolean(this._name, value as unknown as boolean);
                case 'int':
                    return this._settings.set_int(this._name, value as unknown as number);
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
