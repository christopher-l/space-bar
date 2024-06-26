import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Settings } from './Settings';

export class TopBarAdjustments {
    private static _instance: TopBarAdjustments | null;

    static init() {
        TopBarAdjustments._instance = new TopBarAdjustments();
        TopBarAdjustments._instance.init();
    }

    static destroy() {
        TopBarAdjustments._instance!.destroy();
        TopBarAdjustments._instance = null;
    }

    private readonly _settings = Settings.getInstance();
    private _didHideActivitiesButton = false;

    init(): void {
        this._settings.systemWorkspaceIndicator.subscribe(
            (systemWorkspaceIndicator) => {
                if (systemWorkspaceIndicator) {
                    this._restoreSystemWorkspaceIndicator();
                } else {
                    this._hideSystemWorkspaceIndicator();
                }
            },
            { emitCurrentValue: true },
        );
    }

    destroy(): void {
        this._restoreSystemWorkspaceIndicator();
    }

    private _hideSystemWorkspaceIndicator(): void {
        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton && !Main.sessionMode.isLocked && activitiesButton.is_visible()) {
            activitiesButton.hide();
            this._didHideActivitiesButton = true;
        }
    }

    private _restoreSystemWorkspaceIndicator(): void {
        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton && this._didHideActivitiesButton) {
            activitiesButton.show();
            this._didHideActivitiesButton = false;
        }
    }
}
