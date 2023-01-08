import type { Adw } from 'imports/gi';
import { BehaviorPage } from 'preferences/BehaviorPage';
import { AppearancePage } from 'preferences/AppearancePage';
import { ShortcutsPage } from 'preferences/ShortcutsPage';

function init() {}

function fillPreferencesWindow(window: Adw.PreferencesWindow) {
    [new BehaviorPage(), new AppearancePage(), new ShortcutsPage()].forEach((pageObject) => {
        pageObject.window = window;
        pageObject.init();
        window.add(pageObject.page);
    });
}
