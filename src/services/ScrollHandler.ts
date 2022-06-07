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

    private _debounce(): boolean {
        let debounce_amount = this._settings.scrollWheelDebounceAmount.value;
        if (debounce_amount <= 0)
            return true;
        const now = Date.now();
        if (now >= this._lastScrollTime + debounce_amount) {
            this._lastScrollTime = now;
            return true;
        }
        return false;
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
        if (this._debounce() &&  newIndex !== null) {
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
