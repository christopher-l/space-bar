import { WindowPreview as OriginalWindowPreview } from '@girs/gnome-shell/ui/windowPreview';

import type Meta from 'gi://Meta';

export class WindowPreview extends OriginalWindowPreview {
    // Add missing property metaWindow.
    metaWindow: Meta.Window;
}
