export class Subject<T> {
    get value(): T {
        return this._value;
    }

    private _value: T;
    private _observers: ((value: T) => void)[] = [];

    constructor(value: T) {
        this._value = value;
    }

    next(value: T): void {
        this._value = value;
        for (const observer of this._observers) {
            observer(value);
        }
    }

    complete(): void {
        this._observers = [];
    }

    subscribe(callback: (value: T) => void): void {
        this._observers.push(callback);
        callback(this._value);
    }

    unsubscribe(callback: (value: T) => void): void {
        this._observers = this._observers.filter((cb) => cb !== callback);
    }
}
