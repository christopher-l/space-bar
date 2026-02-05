import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { WindowPreview } from 'resource:///org/gnome/shell/ui/windowPreview.js';
import { Settings } from '../services/Settings';
import { Styles } from '../services/Styles';
import { WorkspaceState, Workspaces } from '../services/Workspaces';
import { Subject } from '../utils/Subject';
import { Timeout } from '../utils/Timeout';
import { WorkspacesBarMenu } from './WorkspacesBarMenu';

interface DragEvent {
    x: number;
    y: number;
    dragActor: Clutter.Actor;
    source?: any;
    targetActor: Clutter.Actor;
}

interface DropEvent {
    dropActor: Clutter.Actor;
    targetActor: Clutter.Actor;
    clutterEvent: Clutter.Event;
}

interface DropPosition {
    index: number;
    wsBox: St.Bin;
    position: 'before' | 'after';
    width: number;
}

interface WsBoxPosition {
    index: number;
    center: number;
    wsBox: St.Bin;
}

/**
 * Maximum number of milliseconds between button press and button release to be recognized as click.
 */
const MAX_CLICK_TIME_DELTA = 300;
/**
 * Time in milliseconds until a touch event is recognized as long press.
 */
const LONG_PRESS_DURATION = 500;

export class WorkspacesBar {
    private readonly _name = `${this._extension.metadata.name}`;
    private readonly _settings = Settings.getInstance();
    private readonly _styles = Styles.getInstance();
    private readonly _ws = Workspaces.getInstance();
    private _button: any;
    private _buttonSubject = new Subject<any>(null);
    private _menu!: WorkspacesBarMenu;
    /** The child of `_button` when `indicator-style` is `current-workspace-name`. */
    private _wsLabel?: St.Label;
    /** The child of `_button` when `indicator-style` is `workspaces-bar`. */
    private _wsBar?: St.BoxLayout;
    private readonly _dragHandler = new WorkspacesBarDragHandler(() => this._updateWorkspaces());
    private readonly _touchTimeout = new Timeout();
    private _attentionLabels: St.Label[] = [];
    private _attentionTimerId: number | null = null;
    private _attentionPhase = false;
    private _rippleActors: Clutter.Actor[] = [];

    constructor(private _extension: any) {}

    init(): void {
        this._initButton();
        this._initMenu();
        this._ws.onUpdate(() => this._updateWorkspaces());
        this._styles.onWorkspacesBarChanged(() => this._refreshTopBarConfiguration());
        this._styles.onWorkspaceLabelsChanged(() => this._updateWorkspaces());
        this._settings.alwaysShowNumbers.subscribe(() => this._updateWorkspaces());
        this._settings.enableCustomLabel.subscribe(() => this._updateWorkspaces());
        this._settings.customLabelNamed.subscribe(() => this._updateWorkspaces());
        this._settings.customLabelUnnamed.subscribe(() => this._updateWorkspaces());
        this._settings.indicatorStyle.subscribe(() => this._refreshTopBarConfiguration());
        this._settings.position.subscribe(() => this._refreshTopBarConfiguration());
        this._settings.positionIndex.subscribe(() => this._refreshTopBarConfiguration());
        this._settings.attentionIndicatorEnabled.subscribe(() => this._updateWorkspaces());
        this._settings.attentionIndicatorStyle.subscribe(() => this._updateWorkspaces());
        this._settings.attentionAnimationDuration.subscribe(() => this._updateWorkspaces());
        this._settings.attentionPulseOpacity.subscribe(() => this._updateWorkspaces());
        this._settings.attentionFlashInterval.subscribe(() => this._updateWorkspaces());
        this._settings.attentionTestTrigger.subscribe((value) => {
            if (value) this._runTestAnimation();
        });
    }

    destroy(): void {
        this._clearAttentionTimer();
        this._button.destroy();
        this._menu.destroy();
        this._dragHandler.destroy();
        this._buttonSubject.complete();
        this._touchTimeout.destroy();
    }

    observeWidget(): Subject<any> {
        return this._buttonSubject;
    }

    private _refreshTopBarConfiguration(): void {
        this._button.destroy();
        this._menu.destroy();
        this._initButton();
        this._initMenu();
    }

    private _initButton(): void {
        this._button = new (WorkspacesButton as any)(0.5, this._name);
        this._buttonSubject.next(this._button);
        this._button.styleClass = 'panel-button space-bar';
        switch (this._settings.indicatorStyle.value) {
            case 'current-workspace':
                this._initWorkspaceLabel();
                break;
            case 'workspaces-bar':
                this._initWorkspacesBar();
                break;
        }
        Main.panel.addToStatusArea(
            this._name,
            this._button,
            this._settings.positionIndex.value,
            this._settings.position.value,
        );
        this._updateWorkspaces();
    }

    private _initMenu(): void {
        this._menu = new WorkspacesBarMenu(this._extension, this._button.menu);
        this._menu.init();
    }

    private _initWorkspaceLabel() {
        this._button.styleClass += ' workspace-label';
        this._wsLabel = new St.Label({
            yAlign: Clutter.ActorAlign.CENTER,
        });
        this._button.add_child(this._wsLabel);
        this._button.connect('button-press-event', (actor: any, event: Clutter.Event) => {
            switch (event.get_button()) {
                case 1:
                    if (this._settings.toggleOverview.value) {
                        Main.overview.toggle();
                    } else {
                        this._button.menu.toggle();
                    }
                    return Clutter.EVENT_STOP;
                case 3:
                    this._button.menu.toggle();
                    return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    private _initWorkspacesBar() {
        this._button._delegate = this._dragHandler;
        this._button.trackHover = false;
        this._wsBar = new St.BoxLayout({});
        this._button.add_child(this._wsBar);
    }

    private _updateWorkspaces() {
        switch (this._settings.indicatorStyle.value) {
            case 'current-workspace':
                this._updateWorkspaceLabel();
                break;
            case 'workspaces-bar':
                this._updateWorkspacesBar();
                break;
        }
    }

    private _updateWorkspaceLabel() {
        const workspace = this._ws.workspaces[this._ws.currentIndex];
        this._wsLabel!.set_text(this._ws.getDisplayName(workspace));
    }

    private _updateWorkspacesBar() {
        // destroy old workspaces bar buttons
        this._clearAttentionTimer();
        this._attentionLabels = [];
        this._wsBar!.destroy_all_children();
        this._dragHandler.wsBoxes = [];
        // display all current workspaces buttons
        for (let ws_index = 0; ws_index < this._ws.numberOfEnabledWorkspaces; ++ws_index) {
            const workspace = this._ws.workspaces[ws_index];
            if (workspace.isVisible) {
                const wsBox = this._createWsBox(workspace);
                this._wsBar!.add_child(wsBox);
                this._dragHandler.wsBoxes.push({ workspace, wsBox });
                if (
                    workspace.hasAttention &&
                    this._settings.attentionIndicatorEnabled.value
                ) {
                    const label = wsBox.get_child() as St.Label;
                    this._attentionLabels.push(label);
                }
            }
        }
        this._startAttentionAnimations();
    }

    private _createWsBox(workspace: WorkspaceState): St.Bin {
        const wsBox = new St.Bin({
            visible: true,
            reactive: true,
            canFocus: true,
            trackHover: true,
            styleClass: `workspace-box workspace-box-${workspace.index + 1}`,
        });
        (wsBox as any)._delegate = new WorkspaceBoxDragHandler(workspace);
        const label = this._createLabel(workspace);
        wsBox.set_child(label);
        let lastButton1PressEvent: Clutter.Event | null;
        wsBox.connect('button-press-event', (actor, event: Clutter.Event) => {
            switch (event.get_button()) {
                case 1:
                    lastButton1PressEvent = event;
                    break;
                case 3:
                    this._button.menu.toggle();
                    break;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        // Activate workspaces on button release to not interfere with drag and drop, but make sure
        // we saw a corresponding button-press event to avoid activating workspaces when the click
        // already triggered another action like closing a menu.
        wsBox.connect('button-release-event', (actor, event: Clutter.Event) => {
            switch (event.get_button()) {
                case 1:
                    if (lastButton1PressEvent) {
                        const timeDelta = event.get_time() - lastButton1PressEvent.get_time();
                        if (timeDelta <= MAX_CLICK_TIME_DELTA) {
                            this._ws.switchTo(workspace.index, 'click-on-label');
                        }
                        lastButton1PressEvent = null;
                    }
                    break;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        let lastTouchBeginEvent: Clutter.Event | null;
        wsBox.connect('touch-event', (actor, event: Clutter.Event) => {
            switch (event.type()) {
                case Clutter.EventType.TOUCH_BEGIN:
                    lastTouchBeginEvent = event;
                    this._touchTimeout
                        .once(LONG_PRESS_DURATION)
                        .then(() => this._button.menu.toggle());
                    break;
                case Clutter.EventType.TOUCH_END:
                    if (lastTouchBeginEvent) {
                        const timeDelta = event.get_time() - lastTouchBeginEvent.get_time();
                        if (timeDelta <= MAX_CLICK_TIME_DELTA) {
                            this._ws.switchTo(workspace.index, 'click-on-label');
                        }
                        lastTouchBeginEvent = null;
                    }
                    this._touchTimeout.clearTimeout();
                    break;
                case Clutter.EventType.TOUCH_CANCEL:
                    this._touchTimeout.clearTimeout();
                    break;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._dragHandler.setupDnd(wsBox, workspace, {
            onDragStart: () => this._touchTimeout.clearTimeout(),
        });
        return wsBox;
    }

    private _createLabel(workspace: WorkspaceState): St.Label {
        const label = new St.Label({
            yAlign: Clutter.ActorAlign.CENTER,
            styleClass: 'space-bar-workspace-label',
        });
        if (workspace.index == this._ws.currentIndex) {
            label.styleClass += ' active';
        } else {
            label.styleClass += ' inactive';
        }
        if (workspace.hasWindows) {
            label.styleClass += ' nonempty';
        } else {
            label.styleClass += ' empty';
        }
        if (workspace.hasAttention && this._settings.attentionIndicatorEnabled.value) {
            label.styleClass += ' attention';
        }
        const text = this._ws.getDisplayName(workspace);
        label.set_text(text);
        if (text.trim() === '') {
            label.styleClass += ' no-text';
        }
        return label;
    }

    private _startAttentionAnimations(): void {
        if (this._attentionLabels.length === 0) {
            return;
        }
        const style = this._settings.attentionIndicatorStyle.value;
        if (style === 'pulse') {
            this._startPulseAnimation(this._attentionLabels);
        } else if (style === 'color-flash') {
            this._startColorFlashAnimation(this._attentionLabels);
        } else if (style === 'ripple') {
            this._startRippleAnimation(this._attentionLabels);
        }
    }

    private _startPulseAnimation(
        labels: St.Label[],
        cycles = -1,
        onDone?: (label: St.Label) => void,
    ): void {
        const duration = this._settings.attentionAnimationDuration.value;
        const minOpacity = this._settings.attentionPulseOpacity.value;
        for (const label of labels) {
            const easeParams: any = {
                opacity: minOpacity,
                duration,
                mode: Clutter.AnimationMode.EASE_IN_OUT_SINE,
                repeatCount: cycles < 0 ? -1 : cycles * 2 - 1,
                autoReverse: true,
            };
            if (cycles >= 0 && onDone) {
                easeParams.onComplete = () => {
                    label.set_opacity(255);
                    onDone(label);
                };
            }
            (label as any).ease(easeParams);
        }
    }

    private _startColorFlashAnimation(
        labels: St.Label[],
        cycles = -1,
        onDone?: (label: St.Label) => void,
    ): void {
        const interval = this._settings.attentionFlashInterval.value;
        this._attentionPhase = false;
        let count = 0;
        this._attentionTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            count++;
            this._attentionPhase = !this._attentionPhase;
            for (const label of labels) {
                if (this._attentionPhase) {
                    label.add_style_class_name('attention-flash');
                } else {
                    label.remove_style_class_name('attention-flash');
                }
            }
            if (cycles >= 0 && count >= cycles * 2) {
                for (const label of labels) {
                    label.remove_style_class_name('attention-flash');
                    onDone?.(label);
                }
                this._attentionTimerId = null;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    private _startRippleAnimation(
        labels: St.Label[],
        cycles = -1,
        onDone?: (label: St.Label) => void,
    ): void {
        for (const label of labels) {
            this._spawnRipple(label);
        }
        let count = 1;
        const interval = this._settings.attentionFlashInterval.value;
        this._attentionTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            count++;
            const isLast = cycles >= 0 && count >= cycles;
            for (const label of labels) {
                this._spawnRipple(label, isLast ? onDone : undefined);
            }
            if (isLast) {
                this._attentionTimerId = null;
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    private _spawnRipple(label: St.Label, onDone?: (label: St.Label) => void): void {
        const [x, y] = label.get_transformed_position();
        const [w, h] = label.get_transformed_size();
        const color = this._settings.attentionColor.value;
        const borderRadius = this._settings.inactiveWorkspaceBorderRadius.value;
        const wave = new St.Widget({
            reactive: false,
            x, y, width: w, height: h,
            opacity: 200,
            style: `border: 2px solid ${color}; border-radius: ${borderRadius}px;`,
        });
        wave.set_pivot_point(0.5, 0.5);
        global.stage.add_child(wave);
        this._rippleActors.push(wave);
        const duration = this._settings.attentionAnimationDuration.value;
        (wave as any).ease({
            scaleX: 2.0,
            scaleY: 2.0,
            opacity: 0,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                wave.destroy();
                const idx = this._rippleActors.indexOf(wave);
                if (idx >= 0) this._rippleActors.splice(idx, 1);
                onDone?.(label);
            },
        });
    }

    private _clearAttentionTimer(): void {
        if (this._attentionTimerId !== null) {
            GLib.Source.remove(this._attentionTimerId);
            this._attentionTimerId = null;
        }
        for (const actor of this._rippleActors) {
            actor.destroy();
        }
        this._rippleActors = [];
    }

    private _runTestAnimation(): void {
        this._settings.attentionTestTrigger.value = false;
        if (!this._wsBar) return;
        const labels: St.Label[] = [];
        for (const child of this._wsBar.get_children()) {
            const label = (child as St.Bin).get_child() as St.Label;
            if (label?.styleClass?.includes('inactive')) {
                label.add_style_class_name('attention');
                labels.push(label);
            }
        }
        if (labels.length === 0) return;
        const style = this._settings.attentionIndicatorStyle.value;
        const onDone = (label: St.Label) => label.remove_style_class_name('attention');
        if (style === 'pulse') {
            this._startPulseAnimation(labels, 5, onDone);
        } else if (style === 'color-flash') {
            this._startColorFlashAnimation(labels, 5, onDone);
        } else if (style === 'ripple') {
            this._startRippleAnimation(labels, 5, onDone);
        }
    }
}

var WorkspacesButton = GObject.registerClass(
    class WorkspacesButton extends PanelMenu.Button {
        vfunc_event() {
            return Clutter.EVENT_PROPAGATE;
        }
    },
);

class WorkspacesBarDragHandler {
    wsBoxes: {
        workspace: WorkspaceState;
        wsBox: St.Bin;
    }[] = [];
    private readonly _ws = Workspaces.getInstance();
    private _dragMonitor: any;
    private _draggedWorkspace?: WorkspaceState | null;
    private _wsBoxPositions?: WsBoxPosition[] | null;
    private _initialDropPosition?: DropPosition | null;
    private _barWidthAtDragStart: number | null = null;
    private _hasLeftInitialPosition = false;
    private _workspacesBarOffset: number | null = null;

    constructor(private _updateWorkspaces: () => void) {}

    destroy(): void {
        this._setDragMonitor(false);
    }

    setupDnd(wsBox: St.Bin, workspace: WorkspaceState, hooks: { onDragStart: () => void }): void {
        const draggable = DND.makeDraggable(wsBox, {});
        draggable.connect('drag-begin', () => {
            this._onDragStart(wsBox, workspace);
            hooks.onDragStart();
        });
        draggable.connect('drag-cancelled', () => {
            this._updateDragPlaceholder(this._initialDropPosition!);
            this._onDragFinished(wsBox);
        });
        draggable.connect('drag-end', () => {
            this._updateWorkspaces();
        });
    }

    acceptDrop(source: any, actor: Clutter.Actor, x: number, y: number): boolean {
        if (source instanceof WorkspaceBoxDragHandler) {
            const dropPosition = this._getDropPosition();
            if (dropPosition) {
                if (this._draggedWorkspace!.index !== dropPosition?.index) {
                    this._ws.reorderWorkspace(this._draggedWorkspace!.index, dropPosition?.index);
                }
            }
            this._updateWorkspaces();
            this._onDragFinished(actor as St.Bin);
            return true;
        } else {
            return false;
        }
    }

    handleDragOver(source: any) {
        if (source instanceof WorkspaceBoxDragHandler) {
            const dropPosition = this._getDropPosition();
            this._updateDragPlaceholder(dropPosition);
        }
        return DND.DragMotionResult.CONTINUE;
    }

    private _onDragStart(wsBox: St.Bin, workspace: WorkspaceState): void {
        wsBox.add_style_class_name('dragging');
        this._draggedWorkspace = workspace;
        this._setDragMonitor(true);
        this._barWidthAtDragStart = this._getBarWidth();
        this._setUpBoxPositions(wsBox, workspace);
    }

    private _onDragFinished(wsBox: St.Bin): void {
        wsBox.remove_style_class_name('dragging');
        this._draggedWorkspace = null;
        this._wsBoxPositions = null;
        this._initialDropPosition = null;
        this._hasLeftInitialPosition = false;
        this._barWidthAtDragStart = null;
        this._setDragMonitor(false);
    }

    private _setDragMonitor(add: boolean): void {
        if (add) {
            this._dragMonitor = {
                dragMotion: this._onDragMotion.bind(this),
            };
            DND.addDragMonitor(this._dragMonitor);
        } else if (this._dragMonitor) {
            DND.removeDragMonitor(this._dragMonitor);
        }
    }

    private _onDragMotion(dragEvent: DragEvent): void {
        this._updateDragPlaceholder(this._initialDropPosition!);
        return DND.DragMotionResult.CONTINUE;
    }

    private _setUpBoxPositions(wsBox: St.Bin, workspace: WorkspaceState) {
        const boxIndex = this.wsBoxes.findIndex((box) => box.workspace === workspace);
        this._wsBoxPositions = this._getWsBoxPositions(boxIndex, wsBox.get_width());
        this._initialDropPosition = this._getDropPosition();
        this._updateDragPlaceholder(this._initialDropPosition);
    }

    private _getDropPosition(): DropPosition | undefined {
        const draggedWsBox = this.wsBoxes.find(
            ({ workspace }) => workspace === this._draggedWorkspace,
        )?.wsBox as St.Bin;
        for (const { index, center, wsBox } of this._wsBoxPositions!) {
            if (draggedWsBox.get_x() < center + this._getWorkspacesBarOffset()) {
                return { index, wsBox, position: 'before', width: draggedWsBox.get_width() };
            }
        }
        if (this._wsBoxPositions!.length > 0) {
            const lastWsBox = this._wsBoxPositions![this._wsBoxPositions!.length - 1].wsBox;
            return {
                index: this._ws.lastVisibleWorkspace,
                wsBox: lastWsBox,
                position: 'after',
                width: draggedWsBox.get_width(),
            };
        }
    }

    private _getWsBoxPositions(draggedBoxIndex: number, draggedBoxWidth: number): WsBoxPosition[] {
        const positions = this.wsBoxes
            .filter(({ workspace }) => workspace !== this._draggedWorkspace)
            .map(({ workspace, wsBox }) => ({
                index: getDropIndex(this._draggedWorkspace as WorkspaceState, workspace),
                center: getHorizontalCenter(wsBox),
                wsBox,
            }));
        positions.forEach((position, index) => {
            if (index >= draggedBoxIndex) {
                position.center -= draggedBoxWidth;
            }
        });
        return positions;
    }

    private _updateDragPlaceholder(dropPosition?: DropPosition): void {
        if (
            dropPosition?.index === this._initialDropPosition?.index &&
            dropPosition?.position === this._initialDropPosition?.position
        ) {
            if (!this._getHasLeftInitialPosition()) {
                return;
            }
        } else {
            this._hasLeftInitialPosition = true;
        }
        for (const { wsBox } of this.wsBoxes) {
            if (wsBox === dropPosition?.wsBox) {
                if (dropPosition!.position === 'before') {
                    wsBox?.set_style('margin-left: ' + dropPosition!.width + 'px');
                } else {
                    wsBox?.set_style('margin-right: ' + dropPosition!.width + 'px');
                }
            } else {
                wsBox.set_style(null);
            }
        }
    }

    private _getBarWidth(): number {
        return this.wsBoxes[0].wsBox.get_parent()!.get_width();
    }

    private _getHasLeftInitialPosition(): boolean {
        if (this._hasLeftInitialPosition) {
            return true;
        }
        if (this._barWidthAtDragStart !== this._getBarWidth()) {
            this._hasLeftInitialPosition = true;
        }
        return this._hasLeftInitialPosition;
    }

    private _getWorkspacesBarOffset(): number {
        if (this._workspacesBarOffset === null) {
            this._workspacesBarOffset = 0;
            let widget = this.wsBoxes[0].wsBox.get_parent();
            while (widget) {
                this._workspacesBarOffset += widget.get_x();
                widget = widget.get_parent();
            }
        }
        return this._workspacesBarOffset;
    }
}

class WorkspaceBoxDragHandler {
    constructor(private readonly _workspace: WorkspaceState) {}

    acceptDrop(source: any) {
        if (source instanceof WindowPreview) {
            (source.metaWindow as Meta.Window).change_workspace_by_index(
                this._workspace.index,
                false,
            );
        }
    }

    handleDragOver(source: any) {
        if (source instanceof WindowPreview) {
            return DND.DragMotionResult.MOVE_DROP;
        } else {
            return DND.DragMotionResult.CONTINUE;
        }
    }
}

function getDropIndex(draggedWorkspace: WorkspaceState, workspace: WorkspaceState): number {
    if (draggedWorkspace.index < workspace.index) {
        return workspace.index - 1;
    } else {
        return workspace.index;
    }
}

function getHorizontalCenter(widget: St.Widget): number {
    return widget.get_x() + widget.get_width() / 2;
}
