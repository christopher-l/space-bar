import GLib from 'gi://GLib';

export class Timeout {
    private _timeoutId: number | null = null;

    destroy(): void {
        this._clearTimeout();
    }

    tick() {
        return new Promise<void>((resolve) => {
            this._clearTimeout();
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0, () => {
                this._timeoutId = null;
                resolve();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    private _clearTimeout() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
    }
}
