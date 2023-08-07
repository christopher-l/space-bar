import { Clutter } from 'imports/gi';
import { Settings } from 'services/Settings';
import { Workspaces } from 'services/Workspaces';
import { Subject } from 'utils/Subject';
import { scrollWheelDirectionOptions } from '../preferences/BehaviorPage';
const Main = imports.ui.main;

export class ScrollHandler {
    private _ws = Workspaces.getInstance();
    private _settings = Settings.getInstance();
    private _disconnectBinding?: () => void;
    private _lastScrollTime = 0;
    private _panelButton: any = null;

    init(panelButtonSubject: Subject<any>) {
        panelButtonSubject.subscribe((panelButton) => (this._panelButton = panelButton));
        const panelButtonCallback = (panelButton: any) => this._registerScroll(panelButton);
        this._settings.scrollWheel.subscribe(
            (value) => {
                panelButtonSubject.unsubscribe(panelButtonCallback);
                this._disconnectBinding?.();
                switch (value) {
                    case 'panel':
                        this._registerScroll(Main.panel);
                        break;
                    case 'workspaces-bar':
                        panelButtonSubject.subscribe(panelButtonCallback);
                        break;
                    case 'disabled':
                        this._disconnectBinding = undefined;
                        break;
                }
            },
            { emitCurrentValue: true },
        );
    }

    destroy() {
        this._disconnectBinding?.();
        this._disconnectBinding = undefined;
    }

    private _registerScroll(widget: any): void {
        const scrollBinding = widget.connect('scroll-event', (actor: any, event: any) =>
            this._handle_scroll(actor, event),
        );
        this._disconnectBinding = () => widget.disconnect(scrollBinding);
    }

    /**
     * Checks whether the debounce time since the last scroll event is exceeded, so a scroll event
     * can be accepted.
     *
     * Calling this function resets the debounce timer if the return value is `true`.
     *
     * @returns `true` if the scroll event should be accepted
     */
    private _debounceTimeExceeded(): boolean {
        if (!this._settings.scrollWheelDebounce.value) {
            return true;
        }
        const debounceTime = this._settings.scrollWheelDebounceTime.value;
        const now = Date.now();
        if (now >= this._lastScrollTime + debounceTime) {
            this._lastScrollTime = now;
            return true;
        } else {
            return false;
        }
    }

    private _handle_scroll(actor: any, event: any): boolean {
        // Adapted from https://github.com/timbertson/gnome-shell-scroll-workspaces
        const source = event.get_source();
        if (source !== actor) {
            // Actors in the status area often have their own scroll events, so we ignore events in
            // that area that are not directly on our panel button.
            if (
                Main.panel._rightBox?.contains?.(source) &&
                !this._panelButton?.contains?.(source)
            ) {
                return Clutter.EVENT_PROPAGATE;
            }
        }
        let direction: -1 | 1;
        let directionSetting: keyof typeof scrollWheelDirectionOptions | null = null;
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.UP:
                direction = -1;
                directionSetting = this._settings.scrollWheelVertical.value;
                break;
            case Clutter.ScrollDirection.DOWN:
                direction = 1;
                directionSetting = this._settings.scrollWheelVertical.value;
                break;
            case Clutter.ScrollDirection.LEFT:
                direction = -1;
                directionSetting = this._settings.scrollWheelHorizontal.value;
                break;
            case Clutter.ScrollDirection.RIGHT:
                direction = 1;
                directionSetting = this._settings.scrollWheelHorizontal.value;
                break;
        }
        let newIndex;
        if (directionSetting && directionSetting !== 'disabled') {
            const invertFactor = directionSetting === 'inverted' ? -1 : 1;
            newIndex = this._ws.findVisibleWorkspace((direction! * invertFactor) as -1 | 1, {
                wraparound: this._settings.scrollWheelWrapAround.value,
            });
        } else {
            return Clutter.EVENT_PROPAGATE;
        }
        if (newIndex !== null && this._debounceTimeExceeded()) {
            const workspace = global.workspace_manager.get_workspace_by_index(newIndex);
            if (workspace) {
                workspace.activate(global.get_current_time());
                this._ws.focusMostRecentWindowOnWorkspace(workspace);
            }
        }
        return Clutter.EVENT_STOP;
    }
}
