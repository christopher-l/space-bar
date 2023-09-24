import type Meta from 'gi://Meta';
import { Settings } from './Settings';
import type { Workspaces } from './Workspaces';
type Window = Meta.Window;

export class WorkspaceNames {
    private static _instance: WorkspaceNames | null;
    static init(workspaces: Workspaces): WorkspaceNames {
        this._instance = new WorkspaceNames(workspaces);
        return this._instance;
    }
    static getInstance(): WorkspaceNames {
        return this._instance as WorkspaceNames;
    }

    private readonly _settings = Settings.getInstance();

    private constructor(private readonly _ws: Workspaces) {}

    insert(index: number): void {
        const workspaceNames = this._getNames();
        if (index < workspaceNames.length) {
            workspaceNames.splice(index, 0, '');
        } else {
            setArrayValue(workspaceNames, index, '');
        }
        this._setNames(workspaceNames);
    }

    /**
     * Reorders workspace names according to the given map.
     *
     * Has the possibility to insert and to remove workspaces.
     *
     * @param reorderMap array where keys are new indexes and values are old indexes of workspaces
     */
    reorder(reorderMap: number[]): void {
        const oldWorkspaceNames = this._getNames();
        const newWorkspaceNames: string[] = [];
        for (const [newIndex, oldIndex] of reorderMap.entries()) {
            if (oldIndex >= 0) {
                newWorkspaceNames[newIndex] = oldWorkspaceNames[oldIndex] ?? '';
            } else {
                newWorkspaceNames[newIndex] = '';
            }
        }
        this._setNames(newWorkspaceNames);
    }

    remove(index: number): void {
        const workspaceNames = this._getNames();
        workspaceNames.splice(index, 1);
        this._setNames(workspaceNames);
    }

    rename(index: number, newName: string): void {
        let workspaceNames = this._getNames();
        setArrayValue(workspaceNames, index, newName);
        this._setNames(workspaceNames);
        if (this._settings.smartWorkspaceNames.value && newName) {
            this._saveSmartWorkspaceName(index, newName);
        }
    }

    restoreSmartWorkspaceName(index: number) {
        const windowNames = this._getWindowNames(index);
        const workspacesNamesMap = this._settings.workspaceNamesMap.value;
        for (const windowName of windowNames) {
            if (workspacesNamesMap[windowName]?.length > 0) {
                const newName = workspacesNamesMap[windowName].find(
                    (name) => !this._getEnabledWorkspaceNames().includes(name),
                );
                if (newName) {
                    let workspaceNames = this._getNames();
                    while (workspaceNames.length < index) {
                        workspaceNames.push('');
                    }
                    workspaceNames[index] = newName;
                    this._setNames(workspaceNames);
                    return;
                }
            }
        }
    }

    /**
     * Associates windows on a workspace with a new workspace name.
     */
    private _saveSmartWorkspaceName(index: number, newName: string) {
        const windowNames = this._getWindowNames(index);
        const workspacesNamesMap = this._settings.workspaceNamesMap.value;
        for (const windowName of windowNames) {
            workspacesNamesMap[windowName] = [
                ...(workspacesNamesMap[windowName] ?? []).filter(
                    (name) =>
                        // We add `newName` at the end
                        name !== newName &&
                        // Keep associations with other currently enabled workspaces and drop others
                        this._getEnabledWorkspaceNames().includes(name),
                ),
                newName,
            ];
        }
        this._settings.workspaceNamesMap.value = workspacesNamesMap;
    }

    private _getWindowNames(workspaceIndex: number): string[] {
        const workspace = global.workspace_manager.get_workspace_by_index(workspaceIndex);
        let windows: Window[] = workspace!.list_windows();
        windows = windows.filter((window) => !window.is_on_all_workspaces());
        return windows
            .map((window) => window.get_wm_class())
            .filter((wmClass): wmClass is string => wmClass !== null);
    }

    private _getNames(): string[] {
        return [...this._settings.workspaceNames.value];
    }

    private _setNames(names: string[]): void {
        while (names[names.length - 1] === '') {
            names.pop();
        }
        this._settings.workspaceNames.value = names;
    }

    private _getEnabledWorkspaceNames(): string[] {
        return this._getNames().filter((_, index) => index < this._ws.numberOfEnabledWorkspaces);
    }
}

/**
 * Sets the array's value at the given index, padding any missing elements so all elements have
 * valid values.
 */
function setArrayValue(array: string[], index: number, value: string): void {
    while (array.length < index) {
        array.push('');
    }
    array[index] = value;
}
