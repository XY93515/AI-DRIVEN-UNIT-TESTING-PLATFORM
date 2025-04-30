#!/usr/bin/env node

/**
 * GitHub Token Test Utility
 * 
 * This script tests the validity of your GitHub token against both public GitHub
 * and GitHub Enterprise instances.
 * 
 * Usage:
 * - Run directly: node test-token.js
 * - Or with custom token: node test-token.js YOUR_TOKEN_HERE
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');
const https = require('https');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

let token = process.argv[2] || process.env.GITHUB_TOKEN || config.githubToken;
const githubEndpoints = [
  { name: 'GitHub Public API', url: 'https://api.github.com/user' },
  { name: 'GitHub Enterprise API (github.eagleview.com)', url: 'https://github.eagleview.com/api/v3/user' }
];

/**
 * Test the GitHub token against the specified endpoint
 * @param {string} token - The GitHub token to test
 * @param {object} endpoint - The endpoint information
 * @returns {Promise<object>} - Test result
 */
async function testEndpoint(token, endpoint) {
  console.log(`\n${colors.blue}Testing ${endpoint.name}...${colors.reset}`);
  
  try {
    const response = await axios.get(endpoint.url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 5000
    });
    console.log(`${colors.green}✓ Success! Token is valid for ${endpoint.name}${colors.reset}`);
    console.log(`${colors.cyan}  • Authenticated as: ${response.data.login}${colors.reset}`);
    if (response.headers['x-ratelimit-limit']) {
      console.log(`${colors.cyan}  • Rate limit: ${response.headers['x-ratelimit-remaining']} / ${response.headers['x-ratelimit-limit']} requests remaining${colors.reset}`);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`${colors.red}✗ Error testing token for ${endpoint.name}${colors.reset}`);
    
    if (error.response) {
      console.log(`${colors.red}  • Status: ${error.response.status}${colors.reset}`);
      console.log(`${colors.red}  • Message: ${error.response.data.message || JSON.stringify(error.response.data)}${colors.reset}`);
      
      if (error.response.status === 401) {
        console.log(`${colors.yellow}  • This indicates invalid credentials. Your token may be incorrect or expired.${colors.reset}`);
      } else if (error.response.status === 403) {
        console.log(`${colors.yellow}  • This indicates insufficient permissions or rate limiting.${colors.reset}`);
        if (error.response.headers['x-ratelimit-remaining'] === '0') {
          console.log(`${colors.yellow}  • You've hit the rate limit. Try again later.${colors.reset}`);
        }
      } else if (error.response.status === 404) {
        console.log(`${colors.yellow}  • The endpoint was not found. This could mean:${colors.reset}`);
        console.log(`${colors.yellow}    - This GitHub Enterprise instance doesn't exist${colors.reset}`);
        console.log(`${colors.yellow}    - You don't have access to this resource${colors.reset}`);
      }
    } else if (error.request) {
      console.log(`${colors.red}  • Network error: No response received${colors.reset}`);
      console.log(`${colors.yellow}  • This could be due to:${colors.reset}`);
      console.log(`${colors.yellow}    - No internet connection${colors.reset}`);
      console.log(`${colors.yellow}    - The server is down${colors.reset}`);
      console.log(`${colors.yellow}    - The GitHub instance doesn't exist at this URL${colors.reset}`);
    } else {
      console.log(`${colors.red}  • Error: ${error.message}${colors.reset}`);
    }
    
    return { success: false, error };
  }
}

/**
 * Ask the user for a GitHub token
 * @returns {Promise<string>} - The GitHub token
 */
function askForToken() {
  return new Promise((resolve) => {
    rl.question(`\n${colors.yellow}Please enter your GitHub token: ${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ask if the user wants to save the token to .env
 * @param {string} token - The GitHub token
 * @returns {Promise<boolean>} - True if the user wants to save the token
 */
function askToSaveToken(token) {
  return new Promise((resolve) => {
    rl.question(`\n${colors.yellow}Would you like to save this token to .env? (y/n): ${colors.reset}`, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Save the token to the .env file
 * @param {string} token - The GitHub token to save
 */
function saveTokenToEnv(token) {
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  if (envContent.includes('GITHUB_TOKEN=')) {
    envContent = envContent.replace(/GITHUB_TOKEN=.*/, `GITHUB_TOKEN=${token}`);
  } else {
    envContent += `\nGITHUB_TOKEN=${token}`;
  }
  fs.writeFileSync(envPath, envContent.trim(), 'utf8');
  console.log(`${colors.green}Token saved to .env file${colors.reset}`);
}

async function main() {
  console.log(`\n${colors.bold}${colors.magenta}=== GitHub Token Test Utility ===${colors.reset}`);
  if (!token) {
    console.log(`${colors.yellow}No GitHub token found in command line arguments, environment, or config.${colors.reset}`);
    token = await askForToken();
  }
  let anySuccess = false;
  for (const endpoint of githubEndpoints) {
    const result = await testEndpoint(token, endpoint);
    if (result.success) {
      anySuccess = true;
    }
  }

  if (anySuccess) {
    console.log(`\n${colors.green}${colors.bold}✓ Your token is valid for at least one GitHub instance.${colors.reset}`);
    const saveToken = await askToSaveToken(token);
    if (saveToken) {
      saveTokenToEnv(token);
    }
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ Your token is not valid for any tested GitHub instance.${colors.reset}`);
    console.log(`\n${colors.yellow}Please check the following:${colors.reset}`);
    console.log(`${colors.yellow}1. The token is correctly copied${colors.reset}`);
    console.log(`${colors.yellow}2. The token has not expired${colors.reset}`);
    console.log(`${colors.yellow}3. The token has the required scopes (repo)${colors.reset}`);
    console.log(`${colors.yellow}4. You have access to the GitHub instance${colors.reset}`);
    console.log(`\n${colors.blue}See GITHUB_TOKEN_GUIDE.md for instructions on generating a new token.${colors.reset}`);
  }
  rl.close();
}
main().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  rl.close();
}); 