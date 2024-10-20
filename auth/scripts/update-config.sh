#!/usr/bin/env bash

# Define the configuration file
CONFIG_FILE="ory/config.yaml"

# Fetch the current Ory project configuration
echo "Fetching current Ory configuration..."
ory get project --format yaml > current-config.yaml

# Compare the current configuration with the new configuration
echo "Comparing configurations..."
diff_output=$(diff -u current-config.yaml "$CONFIG_FILE")

# Check if there are differences
if [ -n "$diff_output" ]; then
    echo "Configuration differences:"
    echo "$diff_output"
else
    echo "No differences found. Exiting."
    exit 0
fi

# Check if the --y flag is provided
if [ "$1" != "--y" ]; then
    # Prompt the user for confirmation
    read -p "Do you want to apply these changes? (y/n): " response
    if [ "$response" != "y" ]; then
        echo "Update aborted."
        exit 0
    fi
fi

# Apply the new configuration
echo "Applying new configuration..."
ory update project --file "$CONFIG_FILE"

echo "Loading updated configuration..."
ory get project --format yaml > "$CONFIG_FILE"

echo "Cleaning up..."
rm current-config.yaml

# Confirm the update was successful
echo "Configuration updated successfully."