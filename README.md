# Space Bar

GNOME Shell extension that replaces the top-panel workspace indicator with an i3-like workspaces bar.

On GNOME Extensions: https://extensions.gnome.org/extension/5090/space-bar/

Originally a fork of the extension [Workspaces
Bar](https://extensions.gnome.org/extension/3851/workspaces-bar/) by
[fthx](https://extensions.gnome.org/accounts/profile/fthx), this extension grew into a more
comprehensive set of features to support a workspace-based workflow.

## Project Status

> [!NOTE]
> Maintenance mode

The extension covers its intended features and currently no new features are planned. This means that:

- Migrations to new GNOME versions and fixing of unintended behavior continue to take place.
- Feature requests and pull requests with new features will generally not be addressed.
- Discussions, questions, feedback, thoughts, or contributions of any kind are always welcome!

## Features

- First class support for static and dynamic workspaces as well as multi-monitor setups
- Add, remove, and rename workspaces
- Rearrange workspaces via drag and drop
- Automatically assign workspace names based on started applications
- Keyboard shortcuts extend and refine system shortcuts
- Scroll through workspaces by mouse wheel over the panel
- Customize the appearance

## Build

The source code of this extension is written in TypeScript. The following command will build the
extension and package it to a zip file (requires pnpm, zip, and glib2).

```sh
pnpm install
./scripts/build.sh
```

## Install

The following command will build the extension and install or update it locally.

```sh
./scripts/build.sh -i
```

Alternatively, just unzip the `space-bar@luchrioh.zip` to `~/.local/share/gnome-shell/extensions/space-bar@luchrioh`.

Log out and back in for the installation to take effect.

## Debug

Run a GNOME shell instance in a window:

```sh
dbus-run-session gnome-shell --devkit --wayland
```

View logs:

```sh
journalctl -f -o cat /usr/bin/gnome-shell
```

View logs of settings:

```sh
journalctl -f -o cat /usr/bin/gjs
```

Configuration:

```sh
GSETTINGS_SCHEMA_DIR=::$HOME/.local/share/gnome-shell/extensions/space-bar@luchrioh/schemas dconf-editor /org/gnome/shell/extensions/space-bar/ &>/dev/null
```
