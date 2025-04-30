#!/bin/bash
# GitHub Token Manager for AI Testing Platform
# This script helps manage GitHub tokens for the project

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$SCRIPT_DIR/.env"
CONFIG_FILE="$SCRIPT_DIR/config.js"

# Print banner
echo -e "\n${BOLD}${MAGENTA}GitHub Token Manager for AI Testing Platform${NC}\n"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
if ! command_exists node; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo -e "Please install Node.js before using this script."
  exit 1
fi

# Function to get current token
get_current_token() {
  # Try to get token from .env file first
  if [ -f "$ENV_FILE" ]; then
    TOKEN=$(grep -E "^GITHUB_TOKEN=" "$ENV_FILE" | cut -d= -f2)
    if [ ! -z "$TOKEN" ]; then
      echo "$TOKEN"
      return
    fi
  fi
  
  # If not found in .env, try config.js
  if [ -f "$CONFIG_FILE" ]; then
    TOKEN=$(grep -E "githubToken:" "$CONFIG_FILE" | grep -Eo "'[^']*'" | tr -d "'")
    if [ ! -z "$TOKEN" ]; then
      echo "$TOKEN"
      return
    fi
  fi
  
  echo ""
}

# Function to save token to .env file
save_token_to_env() {
  local TOKEN=$1
  
  if [ -f "$ENV_FILE" ]; then
    # Check if GITHUB_TOKEN already exists
    if grep -q "^GITHUB_TOKEN=" "$ENV_FILE"; then
      # Replace existing token
      sed -i '' "s/^GITHUB_TOKEN=.*/GITHUB_TOKEN=$TOKEN/" "$ENV_FILE"
    else
      # Add new token
      echo "GITHUB_TOKEN=$TOKEN" >> "$ENV_FILE"
    fi
  else
    # Create new .env file
    echo "GITHUB_TOKEN=$TOKEN" > "$ENV_FILE"
  fi
  
  echo -e "${GREEN}Token saved to .env file${NC}"
}

# Function to test token using the node script
test_token() {
  local TOKEN=$1
  echo -e "${BLUE}Testing token...${NC}"
  node "$SCRIPT_DIR/test-token.js" "$TOKEN"
}

# Main menu
while true; do
  CURRENT_TOKEN=$(get_current_token)
  TOKEN_STATUS=""
  
  if [ -z "$CURRENT_TOKEN" ]; then
    TOKEN_STATUS="${YELLOW}No token configured${NC}"
  else
    # Mask the token for display
    MASKED_TOKEN="${CURRENT_TOKEN:0:4}...${CURRENT_TOKEN: -4}"
    TOKEN_STATUS="${GREEN}Token configured: $MASKED_TOKEN${NC}"
  fi
  
  echo -e "\n${BOLD}Current Status:${NC} $TOKEN_STATUS"
  echo -e "\n${BOLD}Options:${NC}"
  echo -e "  ${CYAN}1)${NC} Set new GitHub token"
  echo -e "  ${CYAN}2)${NC} Test current token"
  echo -e "  ${CYAN}3)${NC} View token guide"
  echo -e "  ${CYAN}4)${NC} Exit"
  
  read -p "Select an option (1-4): " OPTION
  
  case $OPTION in
    1)
      echo -e "\n${YELLOW}Please paste your GitHub token:${NC}"
      read -s NEW_TOKEN
      
      if [ -z "$NEW_TOKEN" ]; then
        echo -e "${RED}Error: Token cannot be empty${NC}"
        continue
      fi
      
      save_token_to_env "$NEW_TOKEN"
      
      echo -e "\n${YELLOW}Would you like to test this token now? (y/n)${NC}"
      read TEST_NOW
      
      if [[ "$TEST_NOW" =~ ^[Yy] ]]; then
        test_token "$NEW_TOKEN"
      fi
      ;;
    2)
      if [ -z "$CURRENT_TOKEN" ]; then
        echo -e "${RED}Error: No token configured${NC}"
      else
        test_token "$CURRENT_TOKEN"
      fi
      ;;
    3)
      if [ -f "$SCRIPT_DIR/GITHUB_TOKEN_GUIDE.md" ]; then
        # Check if common markdown viewers exist
        if command_exists bat; then
          bat "$SCRIPT_DIR/GITHUB_TOKEN_GUIDE.md"
        elif command_exists cat; then
          cat "$SCRIPT_DIR/GITHUB_TOKEN_GUIDE.md"
        else
          echo -e "${RED}Error: No markdown viewer found${NC}"
        fi
      else
        echo -e "${YELLOW}GitHub Token Guide:${NC}"
        echo -e "1. Go to GitHub Settings > Developer settings > Personal access tokens"
        echo -e "2. Generate a new token with 'repo' scope"
        echo -e "3. Copy the token and use option 1 to set it"
      fi
      ;;
    4)
      echo -e "${GREEN}Exiting. Goodbye!${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid option. Please try again.${NC}"
      ;;
  esac
done 