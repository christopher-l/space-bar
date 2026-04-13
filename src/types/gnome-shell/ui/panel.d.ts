import { DateMenuButton } from '@girs/gnome-shell/ui/dateMenu';
import { Panel as OriginalPanel, QuickSettings } from '@girs/gnome-shell/ui/panel';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

export type Panel = Overwrite<
    OriginalPanel,
    {
        statusArea: {
            appMenu: any;
            activities: ActivitiesButton;
            quickSettings: QuickSettings;
            dateMenu: DateMenuButton;
            // a11y: ATIndicator;
            // keyboard: InputSourceIndicator;
            // dwellClick: DwellClickIndicator;
            // screenRecording: ScreenRecordingIndicator;
            // screenSharing: ScreenSharingIndicator;
        };
    }
>;

export class ActivitiesButton extends PanelMenu.Button {}
