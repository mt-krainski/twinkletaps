#!/bin/bash

# Project Resolution Helper
# Resolves the active project with the following precedence:
# 1. --project <name> CLI argument
# 2. TWINKLETAPS_PROJECT environment variable
# 3. .active_project file contents
# 4. Error if none found
#
# Usage: source this file from other scripts. It will export:
#   PROJECT_NAME - The project name (e.g., "TwinkleTapsLampNew")
#   PROJECT_DIR  - The project directory (e.g., "src/TwinkleTapsLampNew")
#
# The calling script should pass its arguments to this script via the SCRIPT_ARGS variable:
#   SCRIPT_ARGS="$@"
#   source scripts/_resolve_project.sh

PROJECT_NAME=""

# Check for --project flag in arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# If not found in args, check environment variable
if [ -z "$PROJECT_NAME" ]; then
  PROJECT_NAME="$TWINKLETAPS_PROJECT"
fi

# If still not found, check .active_project file
if [ -z "$PROJECT_NAME" ]; then
  if [ -f ".active_project" ]; then
    PROJECT_NAME=$(cat .active_project)
  fi
fi

# If still not found, error
if [ -z "$PROJECT_NAME" ]; then
  echo "❌ No project specified."
  echo ""
  echo "Please specify a project using one of the following methods:"
  echo "  1. Pass --project flag: ./scripts/<command>.sh --project TwinkleTapsLampNew"
  echo "  2. Set environment variable: export TWINKLETAPS_PROJECT=TwinkleTapsLampNew"
  echo "  3. Set active project: ./scripts/init.sh --project TwinkleTapsLampNew"
  echo ""
  echo "Available projects:"
  if [ -d "src" ]; then
    for dir in src/*/; do
      if [ -d "$dir" ]; then
        basename "$dir"
      fi
    done
  fi
  exit 1
fi

# Set project directory
PROJECT_DIR="src/$PROJECT_NAME"

# Validate that the project exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Project directory not found: $PROJECT_DIR"
  echo ""
  echo "Available projects:"
  if [ -d "src" ]; then
    for dir in src/*/; do
      if [ -d "$dir" ]; then
        basename "$dir"
      fi
    done
  fi
  exit 1
fi

# Validate that the .ino file exists
if [ ! -f "$PROJECT_DIR/$PROJECT_NAME.ino" ]; then
  echo "❌ Arduino sketch not found: $PROJECT_DIR/$PROJECT_NAME.ino"
  exit 1
fi

# Export variables for use by calling script
export PROJECT_NAME
export PROJECT_DIR
