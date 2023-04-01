import type * as Clutter from '@imports/Clutter-11';
import type * as Gio from '@imports/Gio-2.0';
import type * as Meta from '@imports/Meta-11';

export { Clutter };
export { Gio };

declare global {
    const imports: {
        ui: any;
        misc: {
            extensionUtils: any;
        };
        mainloop: any;
    };
    const global: Global;
    const log: (...args: any[]) => void;
}

interface Global {
    log(msg: string): void;
    display: Meta.Display;
    workspace_manager: Meta.WorkspaceManager;
    get_current_time: () => number;
}
