// Adapted from
// https://gitlab.com/rmnvgr/nightthemeswitcher-gnome-shell-extension/-/blob/main/src/preferences/DropDownChoice.js

// FIXME: There is probably some standard object we could use for this.

import GObject from 'gi://GObject';

export declare class DropDownChoiceClass extends GObject.Object {
    id: string;
    title: string;
    constructor(params: { id: string; title: string });
}

export const DropDownChoice = GObject.registerClass(
    {
        GTypeName: 'SpaceBarDropDownChoice',
        Properties: {
            id: GObject.ParamSpec.string(
                'id',
                'ID',
                'Identifier',
                GObject.ParamFlags.READWRITE,
                null,
            ),
            title: GObject.ParamSpec.string(
                'title',
                'Title',
                'Displayed title',
                GObject.ParamFlags.READWRITE,
                null,
            ),
        },
    },
    class DropDownChoice extends GObject.Object {},
) as unknown as typeof DropDownChoiceClass & GObject.GType & GObject.Object;
