import GLib from 'gi://GLib';
import { Subject } from './Subject';

/**
 * A subscribe/notify mechanism that debounces multiple subsequent notify calls.
 */
export class DebouncingNotifier<T = void> {
    private _subscribers: ((value: T) => void)[] = [];
    private _timeout: number | null = null;
    private _delayMs: number;
    private _renew: boolean;

    constructor({ delayMs = 0, renew = false } = {}) {
        this._delayMs = delayMs;
        this._renew = renew;
    }

    notify(value: T): void {
        if (this._timeout) {
            if (this._renew) {
                GLib.Source.remove(this._timeout);
            } else {
                return;
            }
        }
        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._delayMs, () => {
            this._notify(value);
            this._timeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    subscribe(callback: (value: T) => void, until?: Subject<void>): void {
        this._subscribers.push(callback);
        until?.subscribe(
            () => (this._subscribers = this._subscribers.filter((s) => s !== callback)),
        );
    }

    destroy(): void {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
        this._subscribers = [];
    }

    private _notify(value: T): void {
        for (const subscriber of this._subscribers) {
            subscriber(value);
        }
    }
}
