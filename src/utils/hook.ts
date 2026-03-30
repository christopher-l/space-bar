interface IPrototype<T> {
    prototype: T;
}

let _destroyFunctions: (() => void)[] = [];

/**
 * Calls `callback` when the given upstream function gets called.
 */
export function hook<
    F extends string,
    Args extends any[],
    R extends any,
    O extends { [f in F]: (...args: Args) => R },
    C extends IPrototype<O>,
>(
    classObject: C,
    functionName: F,
    pos: 'before' | 'after',
    callback: (self: O, ...args: Args) => void,
) {
    const _originalFunction = classObject.prototype[functionName];
    if (pos === 'before') {
        classObject.prototype[functionName] = function (this: O, ...args: Args) {
            callback(this, ...args);
            _originalFunction.apply(this, args);
        } as O[F];
    } else {
        classObject.prototype[functionName] = function (this: O, ...args: Args) {
            _originalFunction.apply(this, args);
            callback(this, ...args);
        } as O[F];
    }
    _destroyFunctions.push(() => {
        classObject.prototype[functionName] = _originalFunction;
    });
}

export function destroyAllHooks() {
    for (const f of _destroyFunctions) {
        f();
    }
    _destroyFunctions = [];
}
