import { Settings } from 'services/Settings';
import { DebouncingNotifier } from 'utils/DebouncingNotifier';

/**
 * Tracks and provides the styles for the workspaces bar.
 */
export class Styles {
    static _instance: Styles | null;

    static init() {
        Styles._instance = new Styles();
        Styles._instance.init();
    }

    static destroy() {
        Styles._instance!.destroy();
        Styles._instance = null;
    }

    static getInstance(): Styles {
        return Styles._instance as Styles;
    }

    private readonly _settings = Settings.getInstance();

    /** Updated style the workspaces-bar panel button. */
    private _workspacesBarStyle!: string;
    /** Updated style for active workspaces labels. */
    private _activeWorkspaceStyle!: string;
    /** Updated style for inactive workspaces labels. */
    private _inactiveWorkspaceStyle!: string;
    /** Updated style for empty and inactive workspaces labels. */
    private _emptyWorkspaceStyle!: string;
    /** Notifier for changed styles of the workspaces bar. */
    private readonly _workspacesBarUpdateNotifier = new DebouncingNotifier();
    /** Notifier for changed styles of workspaces labels. */
    private readonly _workspaceUpdateNotifier = new DebouncingNotifier();

    init() {
        this._updateWorkspacesBarStyle();
        this._updateActiveWorkspaceStyle();
        this._updateInactiveWorkspaceStyle();
        this._updateEmptyWorkspaceStyle();
        this._registerSettingChanges();
    }

    destroy() {
        this._workspaceUpdateNotifier.destroy();
    }

    /** Calls `callback` when the style of the workspaces bar changed. */
    onWorkspacesBarChanged(callback: () => void): void {
        this._workspacesBarUpdateNotifier.subscribe(callback);
    }

    /** Calls `callback` when the style of a workspaces label changed. */
    onWorkspaceLabelsChanged(callback: () => void): void {
        this._workspaceUpdateNotifier.subscribe(callback);
    }

    getWorkspacesBarStyle(): string {
        return this._workspacesBarStyle;
    }

    getActiveWorkspaceStyle(): string {
        return this._activeWorkspaceStyle;
    }

    getInactiveWorkspaceStyle(): string {
        return this._inactiveWorkspaceStyle;
    }

    getEmptyWorkspaceStyle(): string {
        return this._emptyWorkspaceStyle;
    }

    /** Subscribes to settings and updates changed styles. */
    private _registerSettingChanges(): void {
        [this._settings.workspacesBarPadding].forEach((setting) =>
            setting.subscribe(() => this._updateWorkspacesBarStyle()),
        );
        [
            this._settings.workspaceMargin,
            this._settings.activeWorkspaceBackgroundColor,
            this._settings.activeWorkspaceTextColor,
            this._settings.activeWorkspaceBorderColor,
            this._settings.activeWorkspaceFontSize,
            this._settings.activeWorkspaceFontWeight,
            this._settings.activeWorkspaceBorderRadius,
            this._settings.activeWorkspaceBorderWidth,
            this._settings.activeWorkspacePaddingH,
            this._settings.activeWorkspacePaddingV,
        ].forEach((setting) => setting.subscribe(() => this._updateActiveWorkspaceStyle()));
        [
            this._settings.workspaceMargin,
            this._settings.inactiveWorkspaceBackgroundColor,
            this._settings.inactiveWorkspaceTextColor,
            this._settings.inactiveWorkspaceBorderColor,
            this._settings.inactiveWorkspaceFontSize,
            this._settings.inactiveWorkspaceFontWeight,
            this._settings.inactiveWorkspaceBorderRadius,
            this._settings.inactiveWorkspaceBorderWidth,
            this._settings.inactiveWorkspacePaddingH,
            this._settings.inactiveWorkspacePaddingV,
        ].forEach((setting) => setting.subscribe(() => this._updateInactiveWorkspaceStyle()));
        [
            this._settings.workspaceMargin,
            this._settings.emptyWorkspaceBackgroundColor,
            this._settings.emptyWorkspaceTextColor,
            this._settings.emptyWorkspaceBorderColor,
            this._settings.emptyWorkspaceFontSize,
            this._settings.emptyWorkspaceFontWeight,
            this._settings.emptyWorkspaceBorderRadius,
            this._settings.emptyWorkspaceBorderWidth,
            this._settings.emptyWorkspacePaddingH,
            this._settings.emptyWorkspacePaddingV,
        ].forEach((setting) => setting.subscribe(() => this._updateEmptyWorkspaceStyle()));
    }

    private _updateWorkspacesBarStyle(): void {
        const padding = this._settings.workspacesBarPadding.value;
        this._workspacesBarStyle = `-natural-hpadding: ${padding}px;`;
        this._workspacesBarUpdateNotifier.notify();
    }

    private _updateActiveWorkspaceStyle(): void {
        const margin = this._settings.workspaceMargin.value;
        const backgroundColor = this._settings.activeWorkspaceBackgroundColor.value;
        const textColor = this._settings.activeWorkspaceTextColor.value;
        const borderColor = this._settings.activeWorkspaceBorderColor.value;
        const fontSize = this._settings.activeWorkspaceFontSize.value;
        const fontWeight = this._settings.activeWorkspaceFontWeight.value;
        const borderRadius = this._settings.activeWorkspaceBorderRadius.value;
        const borderWidth = this._settings.activeWorkspaceBorderWidth.value;
        const paddingH = this._settings.activeWorkspacePaddingH.value;
        const paddingV = this._settings.activeWorkspacePaddingV.value;
        this._activeWorkspaceStyle =
            `margin: 0 ${margin}px;` +
            `background-color: ${backgroundColor};` +
            `color: ${textColor};` +
            `border-color: ${borderColor};` +
            `font-weight: ${fontWeight};` +
            `border-radius: ${borderRadius}px;` +
            `border-width: ${borderWidth}px;` +
            `padding: ${paddingV}px ${paddingH}px;`;
        if (fontSize >= 0) {
            this._activeWorkspaceStyle += `font-size: ${fontSize}pt;`;
        }
        this._workspaceUpdateNotifier.notify();
    }

    private _updateInactiveWorkspaceStyle(): void {
        const margin = this._settings.workspaceMargin.value;
        const backgroundColor = this._settings.inactiveWorkspaceBackgroundColor.value;
        const textColor = this._settings.inactiveWorkspaceTextColor.value;
        const borderColor = this._settings.inactiveWorkspaceBorderColor.value;
        const fontSize = this._settings.inactiveWorkspaceFontSize.value;
        const fontWeight = this._settings.inactiveWorkspaceFontWeight.value;
        const borderRadius = this._settings.inactiveWorkspaceBorderRadius.value;
        const borderWidth = this._settings.inactiveWorkspaceBorderWidth.value;
        const paddingH = this._settings.inactiveWorkspacePaddingH.value;
        const paddingV = this._settings.inactiveWorkspacePaddingV.value;
        this._inactiveWorkspaceStyle =
            `margin: 0 ${margin}px;` +
            `background-color: ${backgroundColor};` +
            `color: ${textColor};` +
            `border-color: ${borderColor};` +
            `font-weight: ${fontWeight};` +
            `border-radius: ${borderRadius}px;` +
            `border-width: ${borderWidth}px;` +
            `padding: ${paddingV}px ${paddingH}px;`;
        if (fontSize >= 0) {
            this._inactiveWorkspaceStyle += `font-size: ${fontSize}pt;`;
        }
        this._workspaceUpdateNotifier.notify();
    }

    private _updateEmptyWorkspaceStyle(): void {
        const margin = this._settings.workspaceMargin.value;
        const backgroundColor = this._settings.emptyWorkspaceBackgroundColor.value;
        const textColor = this._settings.emptyWorkspaceTextColor.value;
        const borderColor = this._settings.emptyWorkspaceBorderColor.value;
        const fontSize = this._settings.emptyWorkspaceFontSize.value;
        const fontWeight = this._settings.emptyWorkspaceFontWeight.value;
        const borderRadius = this._settings.emptyWorkspaceBorderRadius.value;
        const borderWidth = this._settings.emptyWorkspaceBorderWidth.value;
        const paddingH = this._settings.emptyWorkspacePaddingH.value;
        const paddingV = this._settings.emptyWorkspacePaddingV.value;
        this._emptyWorkspaceStyle =
            `margin: 0 ${margin}px;` +
            `background-color: ${backgroundColor};` +
            `color: ${textColor};` +
            `border-color: ${borderColor};` +
            `font-weight: ${fontWeight};` +
            `border-radius: ${borderRadius}px;` +
            `border-width: ${borderWidth}px;` +
            `padding: ${paddingV}px ${paddingH}px;`;
        if (fontSize >= 0) {
            this._emptyWorkspaceStyle += `font-size: ${fontSize}pt;`;
        }
        this._workspaceUpdateNotifier.notify();
    }
}
