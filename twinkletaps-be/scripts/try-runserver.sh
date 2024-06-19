#!/usr/bin/env bash

# Simple test to try running the Django dev server.
# Failure here usually means something is pretty badly misconfigured
timeout_result_code=0
timeout 10 poe manage runserver || timeout_result_code=$?
if [ $timeout_result_code -ne 124 ]; then 
    echo "Server did not stay alive long enough - ${timeout_result_code}";
    exit 1;
fi
