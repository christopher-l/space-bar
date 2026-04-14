#!/usr/bin/env bash

set -e

PACK_FILE="space-bar@luchrioh.shell-extension.zip"

function clear() (
	if [ -d dist ]; then
		rm -r dist
	fi
	rm -f "$PACK_FILE"
)

function compile() (
	tsc
)

function copyAdditionalFiles() (
	cp -r src/schemas dist/schemas

	for file in metadata.json README.md; do
		cp "$file" "dist/$file"
	done

	(
		cd src
		for file in stylesheet.css; do
			cp "$file" "../dist/$file"
		done
	)
)

function pack() (
	(cd dist && zip -rq "../$PACK_FILE" .)
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
	copyAdditionalFiles
	pack
	while getopts i flag; do
		case $flag in
		i) install ;;
		esac
	done
)

main "$@"
