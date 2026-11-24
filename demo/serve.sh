#!/usr/bin/env bash
# Dev static server for the wireframes tree. Honors $PORT (harness-assigned).
exec python3 -m http.server "${PORT:-8012}" --directory "$(dirname "$0")"
