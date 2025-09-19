import '@girs/shell-16';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { KeyBindings } from './services/KeyBindings';
import { ScrollHandler } from './services/ScrollHandler';
import { Settings } from './services/Settings';
import { Styles } from './services/Styles';
import { TopBarAdjustments } from './services/TopBarAdjustments';
import { Workspaces } from './services/Workspaces';
import { WorkspacesBar } from './ui/WorkspacesBar';
import { destroyAllHooks } from './utils/hook';

export default class SpaceBarExtension extends Extension {
    private workspacesBar: WorkspacesBar | null = null;
    private scrollHandler: ScrollHandler | null = null;

    enable() {
        Settings.init(this);
        TopBarAdjustments.init();
        Workspaces.init();
        KeyBindings.init();
        Styles.init();
        this.workspacesBar = new WorkspacesBar(this);
        this.workspacesBar.init();
        this.scrollHandler = new ScrollHandler();
        this.scrollHandler.init(this.workspacesBar.observeWidget());
    }

    disable() {
        destroyAllHooks();
        Settings.destroy();
        TopBarAdjustments.destroy();
        Workspaces.destroy();
        KeyBindings.destroy();
        Styles.destroy();
        this.scrollHandler?.destroy();
        this.scrollHandler = null;
        this.workspacesBar?.destroy();
        this.workspacesBar = null;
    }
}
