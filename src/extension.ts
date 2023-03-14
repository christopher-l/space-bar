import { KeyBindings } from 'services/KeyBindings';
import { ScrollHandler } from 'services/ScrollHandler';
import { Settings } from 'services/Settings';
import { TopBarAdjustments } from 'services/TopBarAdjustments';
import { Workspaces } from 'services/Workspaces';
import { WorkspacesBar } from 'ui/WorkspacesBar';

class Extension {
    private workspacesBar: WorkspacesBar | null = null;
    private scrollHandler: ScrollHandler | null = null;

    enable() {
        Settings.init();
        TopBarAdjustments.init();
        Workspaces.init();
        KeyBindings.init();
        this.workspacesBar = new WorkspacesBar();
        this.workspacesBar.init();
        this.scrollHandler = new ScrollHandler();
        this.scrollHandler.init(this.workspacesBar.getWidget());
    }

    disable() {
        Settings.destroy();
        TopBarAdjustments.destroy();
        Workspaces.destroy();
        KeyBindings.destroy();
        this.scrollHandler?.destroy();
        this.scrollHandler = null;
        this.workspacesBar?.destroy();
        this.workspacesBar = null;
    }
}

function init() {
    return new Extension();
}
