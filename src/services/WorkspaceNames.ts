import type { Meta } from 'imports/gi';
import { Settings } from 'services/Settings';
import type { Workspaces } from 'services/Workspaces';
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

    moveByIndex(oldIndex: number, newIndex: number): void {
        const workspaceNames = this._getNames();
        const [element] = workspaceNames.splice(oldIndex, 1);
        if (newIndex < workspaceNames.length) {
            workspaceNames.splice(newIndex, 0, element ?? '');
        } else {
            setArrayValue(workspaceNames, newIndex, element ?? '');
        }
        this._setNames(workspaceNames);
    }

    insert(index: number): void {
        const workspaceNames = this._getNames();
        if (index < workspaceNames.length) {
            workspaceNames.splice(index, 0, '');
        } else {
            setArrayValue(workspaceNames, index, '');
        }
        this._setNames(workspaceNames);
    }

    remove(index: number): void {
        const workspaceNames = this._getNames();
        workspaceNames.splice(index, 1);
        this._setNames(workspaceNames);
    }

    rename(index: number, newName: string): void {
        let workspaceNames = this._getNames();
        const oldName = workspaceNames[index];
        setArrayValue(workspaceNames, index, newName);
        this._setNames(workspaceNames);
        if (this._settings.smartWorkspaceNames.value && newName) {
            this._saveSmartWorkspaceName(index, oldName, newName);
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

    private _saveSmartWorkspaceName(index: number, oldName: string, newName: string) {
        const windowNames = this._getWindowNames(index);
        const workspacesNamesMap = this._settings.workspaceNamesMap.value;
        for (const windowName of windowNames) {
            workspacesNamesMap[windowName] = [
                ...(workspacesNamesMap[windowName] ?? [])
                    // Clear our unused names.
                    .filter(
                        (name) =>
                            name !== newName && this._getEnabledWorkspaceNames().includes(name),
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
        return windows.map((window) => window.get_wm_class());
    }

    private _getNames(): string[] {
        return [...this._settings.workspaceNames.value];
    }

    private _setNames(names: string[]): void {
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
