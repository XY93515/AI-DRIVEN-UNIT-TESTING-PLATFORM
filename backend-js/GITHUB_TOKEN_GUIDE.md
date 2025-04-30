# GitHub Token Guide

## Creating a Personal Access Token (PAT)

### For GitHub.com (Public)

1. Sign in to [GitHub.com](https://github.com)
2. Click on your profile photo in the top right
3. Select **Settings**
4. In the left sidebar, click on **Developer settings**
5. Select **Personal access tokens** → **Tokens (classic)**
6. Click **Generate new token** → **Generate new token (classic)**
7. Give your token a descriptive name
8. Set an expiration date (recommended: 30-90 days)
9. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read user profile data)
   - `user:email` (Access user email addresses)
10. Click **Generate token**
11. **IMPORTANT**: Copy your token immediately! You won't be able to see it again.

### For GitHub Enterprise

1. Sign in to your GitHub Enterprise instance (e.g., `https://github.yourcompany.com`)
2. Follow the same steps as above, but on your enterprise instance

## Token Security Best Practices

- **Never** share your token in public repositories or discussions
- **Never** commit your token to version control
- Use environment variables or secure credential storage
- Set an expiration date for your token
- Only grant the minimum permissions necessary
- Regularly audit and rotate your tokens

## Using Your Token with This Tool

1. Copy your newly created token
2. Run the token-manager.sh script
3. Select option 1 to set a new token
4. Paste your token when prompted
5. Test your token to confirm it works

## Troubleshooting

If your token doesn't work:

- Verify you've selected the correct scopes
- Check that your token hasn't expired
- For GitHub Enterprise, ensure the correct API URL is configured
- Make sure you're not hitting API rate limits
- Check your network connectivity

For more information, see the [GitHub documentation on creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). 