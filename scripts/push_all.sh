#!/bin/bash

# push_all.sh - Project-specific configuration for push_projects.sh
#
# This script defines the list of projects to process and sources the
# reusable push_projects.sh script from the workflows repo.
#
# Usage:
#   ./push_all.sh                              # Update deps and process only projects with changes
#   ./push_all.sh --force                      # Force version bump on all projects
#   ./push_all.sh --subpackages                # Also process sub-packages in /packages directories
#   ./push_all.sh --starting-project <name>    # Skip projects until reaching <name>
#   ./push_all.sh --help                       # Show help message

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Define projects in dependency order with wait times
# Format: "relative_path:wait_after_in_seconds"
#
# Wait times are used for packages that need CI/CD to complete publishing
# before dependent packages can fetch the new version from npm.
PROJECTS=(
    "../svgr_types:60"
    "../svgr_api:0"
    "../svgr_client:60"
    "../svgr_lib:60"
    "../svgr_app:0"
    "../svgr_app_rn:0"
)

# Download reusable script from GitHub
GITHUB_RAW_URL="https://raw.githubusercontent.com/johnqh/workflows/main/scripts/push_projects.sh"
PUSH_SCRIPT=$(mktemp)
trap "rm -f $PUSH_SCRIPT" EXIT

if ! curl -fsSL "$GITHUB_RAW_URL" -o "$PUSH_SCRIPT"; then
    echo "Error: Failed to download push_projects.sh from GitHub"
    exit 1
fi

# Source the reusable script (this imports all functions)
source "$PUSH_SCRIPT"

# Parse command-line arguments
parse_args "$@"

# Run the push process
run_push_projects "$BASE_DIR" "${PROJECTS[@]}"
