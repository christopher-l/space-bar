import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Settings } from '../services/Settings';
import { Workspaces } from '../services/Workspaces';

interface OverlayActor {
    bin: St.Bin;
    label: St.Label;
}

export class OverlayWidget {
    private readonly _settings = Settings.getInstance();
    private readonly _ws = Workspaces.getInstance();

    private _overlays: OverlayActor[] = [];
    private _hideTimeoutId: number | null = null;
    private _lastWorkspaceIndex: number = -1;

    init(): void {
        this._lastWorkspaceIndex = this._ws.currentIndex;
        this._ws.onUpdate(() => this._onWorkspaceUpdate());
    }

    destroy(): void {
        this._clearHideTimeout();
        this._destroyOverlays();
    }

    private _createOverlay(): OverlayActor {
        const label = new St.Label({
            styleClass: 'workspace-name-label',
        });

        const bin = new St.Bin({
            styleClass: 'workspace-name-overlay',
            reactive: false,
            canFocus: false,
            trackHover: false,
            child: label,
            opacity: 0,
            visible: false,
        });

        Main.uiGroup.add_child(bin);
        return { bin, label };
    }

    private _ensureOverlays(monitors: any[]): void {
        this._destroyOverlays();
        for (let i = 0; i < monitors.length; i++) {
            this._overlays.push(this._createOverlay());
        }
    }

    private _destroyOverlays(): void {
        for (const overlay of this._overlays) {
            overlay.bin.destroy();
        }
        this._overlays = [];
    }

    private _onWorkspaceUpdate(): void {
        if (!this._settings.overlayEnabled.value) {
            return;
        }

        const currentIndex = this._ws.currentIndex;
        if (currentIndex === this._lastWorkspaceIndex) {
            return;
        }

        this._lastWorkspaceIndex = currentIndex;
        this._showOverlay();
    }

    private _showOverlay(): void {
        const workspace = this._ws.workspaces[this._ws.currentIndex];
        if (!workspace) {
            return;
        }

        let displayText: string;
        if (this._settings.overlayShowWorkspaceName.value) {
            displayText = this._ws.getDisplayName(workspace);
        } else {
            displayText = `${workspace.index + 1}`;
        }

        const monitors = this._getTargetMonitors();
        if (monitors.length === 0) {
            return;
        }

        this._ensureOverlays(monitors);

        for (let i = 0; i < monitors.length; i++) {
            const overlay = this._overlays[i];
            const monitor = monitors[i];

            overlay.label.set_text(displayText);
            this._centerOnMonitor(overlay.bin, monitor);

            overlay.bin.remove_all_transitions();
            overlay.bin.visible = true;
            Main.uiGroup.set_child_above_sibling(overlay.bin, null);
            (overlay.bin as any).ease({
                opacity: 255,
                duration: 100,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }

        this._clearHideTimeout();
        this._hideTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this._settings.overlayDisplayTime.value,
            () => {
                this._hideOverlays();
                this._hideTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            },
        );
    }

    private _hideOverlays(): void {
        for (const overlay of this._overlays) {
            overlay.bin.remove_all_transitions();
            (overlay.bin as any).ease({
                opacity: 0,
                duration: 100,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    overlay.bin.visible = false;
                },
            });
        }
    }

    private _getTargetMonitors(): any[] {
        const layoutManager = Main.layoutManager;
        if (this._settings.overlayScreen.value === 'all') {
            return layoutManager.monitors ?? [];
        }
        const primary = layoutManager.primaryMonitor;
        return primary ? [primary] : [];
    }

    private _centerOnMonitor(actor: St.Bin, monitor: any): void {
        const [, naturalWidth] = actor.get_preferred_width(-1);
        const [, naturalHeight] = actor.get_preferred_height(-1);

        const x = monitor.x + Math.floor((monitor.width - naturalWidth) / 2);
        const y = monitor.y + Math.floor((monitor.height - naturalHeight) / 2);

        actor.set_position(x, y);
    }

    private _clearHideTimeout(): void {
        if (this._hideTimeoutId !== null) {
            GLib.Source.remove(this._hideTimeoutId);
            this._hideTimeoutId = null;
        }
    }
}
