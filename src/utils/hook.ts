interface IPrototype {
    prototype: any;
}

let _destroyFunctions: (() => void)[] = [];

/**
 * Calls `callback` when the given upstream function gets called.
 */
export function hook<
    F extends string,
    Args extends any[],
    R extends any,
    C extends { [f in F]: (...args: Args) => R } & IPrototype,
>(
    classObject: C,
    functionName: F,
    pos: 'before' | 'after',
    callback: (self: C, ...args: Args) => void,
) {
    const _originalFunction = classObject.prototype[functionName];
    if (pos === 'before') {
        classObject.prototype[functionName] = function (...args: Args) {
            callback(this, ...args);
            _originalFunction.apply(this, args);
        };
    } else {
        classObject.prototype[functionName] = function (...args: Args) {
            _originalFunction.apply(this, args);
            callback(this, ...args);
        };
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
