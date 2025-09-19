import '@girs/adw-1';

import type Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { AppearancePage } from './preferences/AppearancePage';
import { BehaviorPage } from './preferences/BehaviorPage';
import { ShortcutsPage } from './preferences/ShortcutsPage';

export default class SpaceBarExtensionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        [new BehaviorPage(this), new AppearancePage(this), new ShortcutsPage(this)].forEach(
            (pageObject) => {
                pageObject.window = window;
                pageObject.init();
                window.add(pageObject.page);
            },
        );
    }
}
