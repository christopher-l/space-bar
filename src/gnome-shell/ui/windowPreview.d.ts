// Adapted from https://github.com/gjsify/gnome-shell/blob/main/packages/gnome-shell/src/ui/windowPreview.d.ts

import type Shell from 'gi://Shell';
import type Meta from 'gi://Meta';

export class WindowPreview extends Shell.WindowPreview {
    // Add missing property metaWindow.
    metaWindow: Meta.Window;
    _addWindow(_: Meta.Window): void;
    _windowActor: Meta.WindowActor;
}
