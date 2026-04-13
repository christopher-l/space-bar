import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { AppearancePage } from './preferences/AppearancePage.js';
import { BehaviorPage } from './preferences/BehaviorPage.js';
import { ShortcutsPage } from './preferences/ShortcutsPage.js';

export default class SpaceBarExtensionPreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        [new BehaviorPage(this), new AppearancePage(this), new ShortcutsPage(this)].forEach(
            (pageObject) => {
                pageObject.window = window;
                pageObject.init();
                window.add(pageObject.page);
            },
        );
    }
}
