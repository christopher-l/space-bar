import type Meta from './gi/Meta';

declare global {
    const global: Global;
}

interface Global {
    display: Meta.Display;
    workspace_manager: Meta.WorkspaceManager;
    stage: Meta.Stage;
    get_current_time: () => number;
}
