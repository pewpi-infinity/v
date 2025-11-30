#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./view_research.sh <COMMIT_HASH_OR_FILENAME>"
    exit 1
fi

GIT_REF="$1"
TEMP_DIR="$HOME/research_view"
ZIP_DIR="master_zips"
RESEARCH_FILE_NAME="temp_research.zip"

mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo "Attempting to retrieve file content for ref: $GIT_REF"

# Find the name of the file created in master_zips at this commit hash
ZIP_PATH=$(git ls-tree -r "$GIT_REF" "$ZIP_DIR" | awk '{print $4}' | grep '.zip' | head -n 1)

if [ -z "$ZIP_PATH" ]; then
    echo "ERROR: Could not find a ZIP file path in the 'master_zips' directory for ref: $GIT_REF."
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "Found file path: $ZIP_PATH"

# Use 'git show' to retrieve the file content using the full path
git show "$GIT_REF":$ZIP_PATH > "$RESEARCH_FILE_NAME" 2>/dev/null

if [ -s "$RESEARCH_FILE_NAME" ]; then
    echo "Successfully retrieved zip file: $RESEARCH_FILE_NAME"
    
    unzip -o "$RESEARCH_FILE_NAME" > /dev/null

    TXT_FILE=$(find . -maxdepth 1 -name "*.txt" | head -n 1)

    if [ -f "$TXT_FILE" ]; then
        echo "--- Research Content from Hash: $GIT_REF ---"
        cat "$TXT_FILE"
        echo "------------------------------------------------"
    else
        echo "ERROR: Could not find research text inside the zip."
    fi
else
    echo "ERROR: Retrieved file was empty or corrupted."
fi

cd - > /dev/null
rm -rf "$TEMP_DIR"

