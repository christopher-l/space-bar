import Gio from 'gi://Gio';
import St from 'gi://St';
import { DebouncingNotifier } from '../utils/DebouncingNotifier';
import { Settings } from './Settings';

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

    /** Notifier for changed styles of the workspaces bar. */
    private readonly _workspacesBarUpdateNotifier = new DebouncingNotifier();
    /** Notifier for changed styles of workspaces labels. */
    private readonly _workspaceUpdateNotifier = new DebouncingNotifier();
    /**
     * Temporary file containing dynamically loaded styles.
     *
     * We delete the file right after usage, but we keep a reference so we can
     * unload the styles later.
     */
    private _dynamicStyleSheet?: Gio.File;

    init() {
        this._registerSettingChanges();
        this._updateStyleSheet();
    }

    destroy() {
        this._workspaceUpdateNotifier.destroy();
        this._unloadStyleSheet();
    }

    private _updateStyleSheet(): void {
        this._unloadStyleSheet();
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        let styles = this._generateStyleSheetContent();
        this._settings.applicationStyles.value = styles;
        if (this._settings.customStylesEnabled.value) {
            this._settings.customStylesFailed.value = false;
            styles = styles + '\n' + this._settings.customStyles.value;
        }
        const [file, stream] = Gio.File.new_tmp(null);
        const outputStream = Gio.DataOutputStream.new(stream.outputStream);
        outputStream.put_string(styles, null);
        try {
            themeContext.get_theme().load_stylesheet(file);
        } catch (e) {
            console.error('Failed to load stylesheet');
            if (this._settings.customStylesEnabled.value) {
                this._settings.customStylesEnabled.value = false;
                this._settings.customStylesFailed.value = true;
            }
        }
        outputStream.close(null);
        stream.close(null);
        this._dynamicStyleSheet = file;
    }

    private _unloadStyleSheet(): void {
        if (this._dynamicStyleSheet) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().unload_stylesheet(this._dynamicStyleSheet);
            this._dynamicStyleSheet.delete(null);
            this._dynamicStyleSheet = undefined;
        }
    }

    private _generateStyleSheetContent(): string {
        let content = `.space-bar {\n${this._getWorkspacesBarStyle()}}\n\n`;
        content += `.space-bar-workspace-label.active {\n${this._getActiveWorkspaceStyle()}}\n\n`;
        content += `.space-bar-workspace-label.inactive {\n${this._getInactiveWorkspaceStyle()}}\n\n`;
        content += `.space-bar-workspace-label.inactive.empty {\n${this._getEmptyWorkspaceStyle()}}\n\n`;
        content += `.workspace-name-overlay {\n${this._getOverlayStyle()}}\n\n`;
        content += `.workspace-name-overlay .workspace-name-label {\n${this._getOverlayLabelStyle()}}`;
        return content;
    }

    /** Calls `callback` when the style of the workspaces bar changed. */
    onWorkspacesBarChanged(callback: () => void): void {
        this._workspacesBarUpdateNotifier.subscribe(callback);
    }

    /** Calls `callback` when the style of a workspaces label changed. */
    onWorkspaceLabelsChanged(callback: () => void): void {
        this._workspaceUpdateNotifier.subscribe(callback);
    }

    /** Subscribes to settings and updates changed styles. */
    private _registerSettingChanges(): void {
        [this._settings.workspacesBarPadding].forEach((setting) =>
            setting.subscribe(() => {
                this._updateStyleSheet();
                this._workspacesBarUpdateNotifier.notify();
            }),
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
        ].forEach((setting) =>
            setting.subscribe(() => {
                this._updateStyleSheet();
                this._workspaceUpdateNotifier.notify();
            }),
        );
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
        ].forEach((setting) =>
            setting.subscribe(() => {
                this._updateStyleSheet();
                this._workspaceUpdateNotifier.notify();
            }),
        );
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
        ].forEach((setting) =>
            setting.subscribe(() => {
                this._updateStyleSheet();
                this._workspaceUpdateNotifier.notify();
            }),
        );
        [
            this._settings.overlayBackgroundColor,
            this._settings.overlayTextColor,
            this._settings.overlayFontSize,
            this._settings.overlayFontWeight,
            this._settings.overlayBorderRadius,
            this._settings.overlayPaddingV,
            this._settings.overlayPaddingH,
        ].forEach((setting) =>
            setting.subscribe(() => {
                this._updateStyleSheet();
            }),
        );
        this._settings.customStylesEnabled.subscribe(() => {
            this._updateStyleSheet();
            this._workspacesBarUpdateNotifier.notify();
        });
        this._settings.customStyles.subscribe(() => {
            if (this._settings.customStylesEnabled.value) {
                this._updateStyleSheet();
                this._workspacesBarUpdateNotifier.notify();
            }
        });
    }

    /** Updated style the workspaces-bar panel button. */
    private _getWorkspacesBarStyle(): string {
        const padding = this._settings.workspacesBarPadding.value;
        let workspacesBarStyle = `  -natural-hpadding: ${padding}px;\n`;
        return workspacesBarStyle;
    }

    /** Updated style for active workspaces labels. */
    private _getActiveWorkspaceStyle(): string {
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
        let activeWorkspaceStyle =
            `  margin: 0 ${margin}px;\n` +
            `  background-color: ${backgroundColor};\n` +
            `  color: ${textColor};\n` +
            `  border-color: ${borderColor};\n` +
            `  font-weight: ${fontWeight};\n` +
            `  border-radius: ${borderRadius}px;\n` +
            `  border-width: ${borderWidth}px;\n` +
            `  padding: ${paddingV}px ${paddingH}px;\n`;
        if (fontSize >= 0) {
            activeWorkspaceStyle += `  font-size: ${fontSize}pt;\n`;
        }
        return activeWorkspaceStyle;
    }

    /** Updated style for inactive workspaces labels. */
    private _getInactiveWorkspaceStyle(): string {
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
        let inactiveWorkspaceStyle =
            `  margin: 0 ${margin}px;\n` +
            `  background-color: ${backgroundColor};\n` +
            `  color: ${textColor};\n` +
            `  border-color: ${borderColor};\n` +
            `  font-weight: ${fontWeight};\n` +
            `  border-radius: ${borderRadius}px;\n` +
            `  border-width: ${borderWidth}px;\n` +
            `  padding: ${paddingV}px ${paddingH}px;\n`;
        if (fontSize >= 0) {
            inactiveWorkspaceStyle += `  font-size: ${fontSize}pt;\n`;
        }
        return inactiveWorkspaceStyle;
    }

    /** Style for the workspace overlay container. */
    private _getOverlayStyle(): string {
        const backgroundColor = this._settings.overlayBackgroundColor.value;
        const borderRadius = this._settings.overlayBorderRadius.value;
        const paddingV = this._settings.overlayPaddingV.value;
        const paddingH = this._settings.overlayPaddingH.value;
        return (
            `  background-color: ${backgroundColor};\n` +
            `  border-radius: ${borderRadius}px;\n` +
            `  padding: ${paddingV}px ${paddingH}px;\n`
        );
    }

    /** Style for the workspace overlay label. */
    private _getOverlayLabelStyle(): string {
        const fontSize = this._settings.overlayFontSize.value;
        const fontWeight = this._settings.overlayFontWeight.value;
        const textColor = this._settings.overlayTextColor.value;
        return (
            `  font-size: ${fontSize}px;\n` +
            `  font-weight: ${fontWeight};\n` +
            `  color: ${textColor};\n`
        );
    }

    /** Updated style for empty and inactive workspaces labels. */
    private _getEmptyWorkspaceStyle(): string {
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
        let emptyWorkspaceStyle =
            `  margin: 0 ${margin}px;\n` +
            `  background-color: ${backgroundColor};\n` +
            `  color: ${textColor};\n` +
            `  border-color: ${borderColor};\n` +
            `  font-weight: ${fontWeight};\n` +
            `  border-radius: ${borderRadius}px;\n` +
            `  border-width: ${borderWidth}px;\n` +
            `  padding: ${paddingV}px ${paddingH}px;\n`;
        if (fontSize >= 0) {
            emptyWorkspaceStyle += `  font-size: ${fontSize}pt;\n`;
        }
        return emptyWorkspaceStyle;
    }
}
