import type Meta from './gi/Meta';

declare global {
    const global: Global;
}

interface Global {
    display: Meta.Display;
    workspace_manager: Meta.WorkspaceManager;
    get_current_time: () => number;
}
