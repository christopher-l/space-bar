import { Clutter } from 'imports/gi';
import { Settings } from 'services/Settings';
import { Workspaces } from 'services/Workspaces';
const Main = imports.ui.main;

export class ScrollHandler {
    private _ws = Workspaces.getInstance();
    private _settings = Settings.getInstance();
    private _disconnectBinding?: () => void;
    private _lastScrollTime = 0;

    init(panelButton: any) {
        this._settings.scrollWheel.subscribe(
            (value) => {
                this._disconnectBinding?.();
                switch (value) {
                    case 'panel':
                        this._registerScroll(Main.panel);
                        break;
                    case 'workspaces-bar':
                        this._registerScroll(panelButton);
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
            // Actors in the status area often have their own scroll events,
            if (Main.panel._rightBox?.contains?.(source)) {
                return Clutter.EVENT_PROPAGATE;
            }
        }
        const currentIndex = global.workspace_manager.get_active_workspace_index();
        let newIndex;
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.UP:
                newIndex = this._findVisibleWorkspace(currentIndex, -1);
                break;
            case Clutter.ScrollDirection.DOWN:
                newIndex = this._findVisibleWorkspace(currentIndex, 1);
                break;
            default:
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

    private _findVisibleWorkspace(index: number, step: number): number | null {
        while (true) {
            index += step;
            if (index < 0 || index >= this._ws.numberOfEnabledWorkspaces) {
                break;
            }
            if (this._ws.workspaces[index].isVisible) {
                return index;
            }
        }
        return null;
    }
}
