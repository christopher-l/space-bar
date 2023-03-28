import type * as Clutter10 from '@imports/Clutter-10';
import type * as Gio20 from '@imports/Gio-2.0';
import type * as Meta from '@imports/Meta-10';

export { Clutter10 as Clutter };
export { Gio20 as Gio };

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
