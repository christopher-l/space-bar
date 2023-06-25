const Mainloop = imports.mainloop;
import { GLib } from 'imports/gi';

export class Timeout {
    private _timeoutId: number | null = null;

    destroy(): void {
        this._clearTimeout();
    }

    tick() {
        return new Promise<void>((resolve) => {
            this._clearTimeout();
            this._timeoutId = Mainloop.timeout_add(0, () => {
                this._timeoutId = null;
                resolve();
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
