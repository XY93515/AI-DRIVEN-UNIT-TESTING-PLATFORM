#!/bin/bash

# Script to start the backend server with GitHub token
# This script helps you set up and run the server with your GitHub token

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "# GitHub API Token" > .env
  
  # Prompt user for GitHub token
  echo -n "Enter your GitHub token (or press Enter to skip): "
  read token
  
  if [ ! -z "$token" ]; then
    echo "GITHUB_TOKEN=$token" >> .env
    echo "Token saved to .env file."
  else
    echo "GITHUB_TOKEN=your_github_token_here" >> .env
    echo "No token provided. You'll need to edit the .env file manually."
  fi
  
  echo "PORT=8081" >> .env
else
  echo ".env file already exists."
fi

# Start the server
echo "Starting server..."
node server.js 