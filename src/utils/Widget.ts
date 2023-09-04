import { St } from 'imports/gi';
import { Subject } from 'utils/Subject';

export function onDestroyed(widget: St.Widget): Subject<void> {
    const subject = new Subject<void>(void 0);
    widget.connect('destroy', () => {
        subject.next();
        subject.complete();
    });
    return subject;
}
