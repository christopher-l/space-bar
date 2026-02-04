#!/usr/bin/env bash

set -e

PACK_FILE="space-bar@luchrioh.shell-extension.zip"

function clear() (
	if [ -d target ]; then
		rm -r target
	fi
)

function compile() (
	npx tsc
)

function fixupJavaScript() (
	for file in $(find target -name '*.js'); do
		# Add .js suffix for relative imports.
		sed -i -E "s/^import (.*) from '(\.+.*)';$/import \1 from '\2.js';/g" "${file}"
		# Remove @girs imports.
		sed -i "/^import '@girs\/.*';$/d" "${file}"
	done
)

function copyAdditionalFiles() (
	cp -r src/schemas target/schemas

	for file in metadata.json README.md; do
		cp "$file" "target/$file"
	done

	(
		cd src
		for file in stylesheet.css; do
			cp "$file" "../target/$file"
		done
	)
)

function pack() (
	gnome-extensions pack target --force $(
		cd target
		for file in *; do echo "--extra-source=$file"; done
	)
	echo "Packed $PACK_FILE"
)

function install() (
	gnome-extensions install --force "$PACK_FILE"
	echo "Installed $PACK_FILE"
)

function main() (
	cd "$(dirname ${BASH_SOURCE[0]})/.."
	clear
	compile
	fixupJavaScript
	copyAdditionalFiles
	pack
	while getopts i flag; do
		case $flag in
		i) install ;;
		esac
	done
)

main "$@"
