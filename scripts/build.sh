#!/usr/bin/env bash

set -e

PACK_FILE="space-bar@luchrioh.zip"

function clear() (
	rm -rf dist
	rm -f "$PACK_FILE"
)

function compile() (
	tsc
)

function copyAdditionalFiles() (
	cp metadata.json README.md src/stylesheet.css dist
	cp -r src/schemas dist/schemas
)

function compileSchema() (
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
	cd "$(dirname ${BASH_SOURCE[0]})/.."
	clear
	compile
	copyAdditionalFiles
	compileSchema
	pack
	while getopts i flag; do
		case $flag in
		i) install ;;
		esac
	done
)

main "$@"
