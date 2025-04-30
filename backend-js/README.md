# Test Generator Backend

Backend server for the AI-powered test generation platform.

## GitHub Authentication Setup

To use GitHub repository integration, you need to authenticate with GitHub's API using a Personal Access Token (PAT). Here's how to set it up:

### Step 1: Generate a GitHub Personal Access Token

1. Go to your GitHub account settings: https://github.com/settings/tokens
2. Click "Generate new token" > "Generate new token (classic)"
3. Give it a descriptive name like "Test Generator App"
4. Set the appropriate scopes:
   - For full access, select `repo` (includes private repos)
   - For public repos only, select `public_repo`
5. Click "Generate token"
6. **Important**: Copy the token immediately as you won't be able to see it again

### Step 2: Add the Token to the Application

You have three options to add your token to the application:

#### Option 1: Using the start script (recommended)

```bash
./start.sh
```
This script will prompt you for your GitHub token and save it in a `.env` file.

#### Option 2: Create a .env file manually

Create a file named `.env` in the project root with the following content:

```
GITHUB_TOKEN=your_github_token_here
PORT=8081
```

Replace `your_github_token_here` with your actual GitHub token.

#### Option 3: Modify config.js

Edit the `config.js` file and replace the placeholder token with your actual token:

```javascript
githubToken: 'your_actual_token_here',
```

### Step 3: Start the Server

After adding your token, start the server:

```bash
npm start
# or
node server.js
```

## Troubleshooting

If you see authentication errors in the console:

1. Check that your token is correctly set in either the `.env` file or `config.js`
2. Verify that your token has the correct GitHub permissions
3. For GitHub Enterprise users, ensure your token works with your specific GitHub instance

## Running without a GitHub Token

You can run the application without a GitHub token, but repository integration will fall back to simulated data instead of accessing actual repository content. 