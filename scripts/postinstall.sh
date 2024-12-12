#!/usr/bin/env bash

set -Eeuo pipefail

echo "De-duplicating..."

# Deduplicate
yarn dedupe
