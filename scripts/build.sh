#!/usr/bin/env bash

set -e

PACK_FILE="space-bar@luchrioh.zip"

function printUsage() (
    echo Usage: $0 [options...]
    echo " -h  Print this message"
    echo " -s  Compile schemas"
    echo " -i  Install the extension after building"
)

function clear() (
	rm -rf dist
	rm -f "$PACK_FILE"
)

function compile() (
	pnpm run build
)

function copyAdditionalFiles() (
	cp metadata.json README.md src/stylesheet.css dist
	cp -r src/schemas dist/schemas
)

function compileSchema() (
    echo Compiling schemas...
	glib-compile-schemas dist/schemas
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
   	while getopts his flag; do
		case $flag in
		h)
            printUsage
            exit ;;
		s) schemas=1 ;;
		i) install=1 ;;
		esac
	done
	cd "$(dirname ${BASH_SOURCE[0]})/.."
	clear
	compile
	copyAdditionalFiles
	if [ -n "$schemas" ]; then
        compileSchema
    fi
	pack
	if [ -n "$install" ]; then
		install
	fi
)

main "$@"
