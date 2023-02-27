const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
import type { Meta } from 'imports/gi';
import { Clutter, GObject, St } from 'imports/gi';
import { Settings } from 'services/Settings';
import { Workspaces, WorkspaceState } from 'services/Workspaces';
import { WorkspacesBarMenu } from 'ui/WorkspacesBarMenu';
const PanelMenu = imports.ui.panelMenu;
const DND = imports.ui.dnd;
const { WindowPreview } = imports.ui.windowPreview;

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

export class WorkspacesBar {
    private readonly _name = `${Me.metadata.name}`;
    private readonly _settings = Settings.getInstance();
    private readonly _ws = Workspaces.getInstance();
    readonly button = new (WorkspacesButton as any)(0.5, this._name);
    private _wsBar!: St.BoxLayout;
    private readonly _dragHandler = new WorkspacesBarDragHandler(() => this._updateWorkspaces());

    constructor() {}

    init(): void {
        this._initButton();
        new WorkspacesBarMenu(this.button.menu).init();
    }

    destroy(): void {
        this._wsBar.destroy();
        this.button.destroy();
        this._dragHandler.destroy();
    }

    private _initButton(): void {
        this.button._delegate = this._dragHandler;
        this.button.track_hover = false;
        this.button.style_class = 'panel-button space-bar';
        this._ws.onUpdate(() => this._updateWorkspaces());

        // bar creation
        let barPosition = this._settings.position.value;
        this._wsBar = new St.BoxLayout({});
        this._updateWorkspaces();
        this.button.add_child(this._wsBar);
        Main.panel.addToStatusArea(this._name, this.button, 0, barPosition);
    }

    // update the workspaces bar
    private _updateWorkspaces() {
        // destroy old workspaces bar buttons
        this._wsBar.destroy_all_children();
        this._dragHandler.wsBoxes = [];
        // display all current workspaces buttons
        for (let ws_index = 0; ws_index < this._ws.numberOfEnabledWorkspaces; ++ws_index) {
            const workspace = this._ws.workspaces[ws_index];
            if (workspace.isVisible) {
                const wsBox = this._createWsBox(workspace);
                this._wsBar.add_child(wsBox);
                this._dragHandler.wsBoxes.push({ workspace, wsBox });
            }
        }
    }

    private _createWsBox(workspace: WorkspaceState): St.Bin {
        const wsBox = new St.Bin({
            visible: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
            style_class: 'workspace-box',
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
                case 2:
                    this._ws.removeWorkspace(workspace.index);
                    break;
                case 3:
                    this.button.menu.toggle();
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
                            this._ws.activate(workspace.index);
                        }
                        lastButton1PressEvent = null;
                    }
                    break;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._dragHandler.setupDnd(wsBox, workspace);
        return wsBox;
    }

    private _createLabel(workspace: WorkspaceState): St.Label {
        const label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'space-bar-workspace-label',
        });
        if (workspace.index == this._ws.currentIndex) {
            label.style_class += ' active';
        } else {
            label.style_class += ' inactive';
        }
        if (workspace.hasWindows) {
            label.style_class += ' nonempty';
        } else {
            label.style_class += ' empty';
        }
        label.set_text(this._ws.getDisplayName(workspace));
        return label;
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

    setupDnd(wsBox: St.Bin, workspace: WorkspaceState): void {
        const draggable = DND.makeDraggable(wsBox, {});
        draggable.connect('drag-begin', () => {
            this._onDragStart(wsBox, workspace);
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
