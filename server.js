// Add a new endpoint to test GitHub API connectivity
app.get('/api/test-github', async (req, res) => {
  try {
    console.log('Testing GitHub Enterprise API connection...');
    
    // Try to access GitHub Enterprise API
    const enterpriseClient = axios.create({
      baseURL: 'YOUR_GITHUB_URL_LINK',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` })
      },
      timeout: 10000
    });
    
    // Test connection by getting user info
    const userResponse = await enterpriseClient.get('/user');
    console.log('GitHub Enterprise API connection successful. User:', userResponse.data.login);
    
    // Get repositories for the authenticated user
    const reposResponse = await enterpriseClient.get('/user/repos?per_page=10');
    console.log(`Found ${reposResponse.data.length} repositories`);
    
    res.status(200).json({
      success: true,
      message: 'GitHub Enterprise API connection successful',
      user: userResponse.data.login,
      repositories: reposResponse.data.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        url: repo.html_url
      }))
    });
  } catch (error) {
    console.error('Error accessing GitHub Enterprise API:', error.message);
    
    let errorDetail = '';
    if (error.response) {
      errorDetail = `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      errorDetail = 'No response received from server. Network error.';
    } else {
      errorDetail = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to connect to GitHub Enterprise API',
      error: errorDetail
    });
  }
});

// Add a new endpoint for mocking GitHub repositories
app.post('/api/mock-repository', async (req, res) => {
  try {
    const { repoUrl, owner, repo } = req.body;
    
    console.log('Creating mock repository with data from:', repoUrl);
    
    // Use provided owner/repo or extract from URL
    const repoOwner = owner || repoUrl.split('/').slice(-2)[0];
    const repoName = repo || repoUrl.split('/').slice(-1)[0];
    
    // Create mock repository data
    const mockRepo = {
      owner: repoOwner,
      repo: repoName,
      url: repoUrl || `https://github.com/${repoOwner}/${repoName}`,
      clonedAt: new Date().toISOString(),
      files: [
        `src/components/${repoName}Component.js`,
        `src/components/${repoName}List.js`,
        `src/services/${repoName}Service.js`,
        `src/utils/helpers.js`,
        `tests/components/${repoName}Component.test.js`,
        'package.json',
        'README.md'
      ],
      branches: ['main', 'develop', 'feature/new-ui'],
      defaultBranch: 'main',
      isMock: true
    };
    
    // Create a directory for this repository if it doesn't exist
    const repoDir = path.join(uploadDir, `${repoOwner}-${repoName}`);
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    
    // Save metadata for future use
    fs.writeFileSync(
      path.join(repoDir, 'metadata.json'),
      JSON.stringify(mockRepo, null, 2)
    );
    
    res.status(200).json({
      success: true,
      repoData: mockRepo,
      message: 'Mock repository created successfully'
    });
    
  } catch (error) {
    console.error('Error creating mock repository:', error);
    res.status(500).json({ error: 'Failed to create mock repository: ' + error.message });
  }
});

// Add endpoint to get file content from a mock repository
app.get('/api/mock-file-content', async (req, res) => {
  try {
    const { owner, repo, path: filePath } = req.query;
    
    if (!owner || !repo || !filePath) {
      return res.status(400).json({ error: 'Owner, repo, and path parameters are required' });
    }
    
    console.log(`Generating mock content for ${filePath} in ${owner}/${repo}`);
    
    // Generate mock file content based on file extension
    let mockContent = '';
    const fileExt = filePath.split('.').pop().toLowerCase();
    
    if (fileExt === 'js' || fileExt === 'jsx') {
      mockContent = `// Mock JavaScript file: ${filePath}
import React from 'react';

// Component definition
function ${filePath.split('/').pop().split('.')[0]}() {
  return (
    <div className="component">
      <h2>Mock Component</h2>
      <p>This is mock content for demonstration purposes.</p>
    </div>
  );
}

export default ${filePath.split('/').pop().split('.')[0]};
`;
    } else if (fileExt === 'json') {
      mockContent = `{
  "name": "${repo}",
  "version": "1.0.0",
  "description": "Mock package.json for ${owner}/${repo}",
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "start": "react-scripts start"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`;
    } else if (fileExt === 'md') {
      mockContent = `# ${repo}

This is a mock README file for ${owner}/${repo}.

## Features
- Feature 1
- Feature 2

## Installation
\`\`\`
npm install
npm start
\`\`\`
`;
    } else {
      mockContent = `// Mock content for ${filePath}
// This is a generated file for demonstration purposes.
`;
    }
    
    res.status(200).json({
      path: filePath,
      content: mockContent,
      isMock: true
    });
    
  } catch (error) {
    console.error('Error generating mock file content:', error);
    res.status(500).json({ error: 'Failed to generate mock content' });
  }
});

// Modified endpoint to handle GitHub repository linking with fallback to mock data
app.post('/api/link-repository', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    console.log('Attempting to link repository:', repoUrl);
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    // Extract owner and repo name from GitHub URL
    let repoDetails;
    try {
      // Simple extraction for demo purposes
      const urlParts = repoUrl.split('/');
      repoDetails = {
        owner: urlParts[urlParts.length - 2],
        repo: urlParts[urlParts.length - 1],
        domain: urlParts[2]
      };
      console.log('Extracted repo details:', repoDetails);
    } catch (error) {
      console.error('Error extracting repo details:', error.message);
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }
    
    const { owner, repo } = repoDetails;
    
    // Create a directory for this repository if it doesn't exist
    const repoDir = path.join(uploadDir, `${owner}-${repo}`);
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    
    // Try to access real repository data first
    try {
      console.log('Attempting to fetch repository data from GitHub...');
      
      // Create GitHub client for the specific domain
      const enterpriseClient = axios.create({
        baseURL: 'GITHUB_URL_LINK',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` })
        },
        timeout: 5000
      });
      
      // Test the API connection
      await enterpriseClient.get('/user');
      
      // Get repository details
      const repoResponse = await enterpriseClient.get(`/repos/${owner}/${repo}`);
      const defaultBranch = repoResponse.data.default_branch || 'main';
      
      // Get branches
      const branchesResponse = await enterpriseClient.get(`/repos/${owner}/${repo}/branches`);
      const branches = branchesResponse.data.map(branch => branch.name);
      
      // Get files (recursive tree)
      const treeResponse = await enterpriseClient.get(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
      const files = treeResponse.data.tree
        .filter(item => item.type === 'blob')
        .map(item => item.path);
      
      // Create repository metadata
      const repoMetadata = {
        owner,
        repo,
        url: repoUrl,
        clonedAt: new Date().toISOString(),
        files,
        branches,
        defaultBranch,
        lastCommit: treeResponse.data.sha
      };
      
      // Save metadata
      fs.writeFileSync(
        path.join(repoDir, 'metadata.json'),
        JSON.stringify(repoMetadata, null, 2)
      );
      
      return res.status(200).json({
        success: true,
        repoData: repoMetadata,
        message: 'Repository linked successfully'
      });
      
    } catch (error) {
      console.error('Error fetching from GitHub API:', error.message);
      console.log('Falling back to mock repository data...');
      
      // Create mock repository data as fallback
      const mockRepo = {
        owner,
        repo,
        url: repoUrl,
        clonedAt: new Date().toISOString(),
        files: [
          `src/components/${repo}Component.js`,
          `src/components/${repo}List.js`,
          `src/services/${repo}Service.js`,
          `src/utils/helpers.js`,
          `tests/components/${repo}Component.test.js`,
          'package.json',
          'README.md'
        ],
        branches: ['main', 'develop', 'feature/new-ui'],
        defaultBranch: 'main',
        isMock: true,
        note: `Using mock data due to API error: ${error.message}`
      };
      
      // Save metadata
      fs.writeFileSync(
        path.join(repoDir, 'metadata.json'),
        JSON.stringify(mockRepo, null, 2)
      );
      
      return res.status(200).json({
        success: true,
        repoData: mockRepo,
        warning: 'Using mock repository data. Could not access GitHub API.',
        error: error.message
      });
    }
    
  } catch (error) {
    console.error('Error linking repository:', error);
    res.status(500).json({ error: 'Failed to link repository: ' + error.message });
  }
});

// Endpoint to get file content from a repository (real or mock)
app.get('/api/repo-file-content', async (req, res) => {
  try {
    const { owner, repo, path: filePath } = req.query;
    
    if (!owner || !repo || !filePath) {
      return res.status(400).json({ error: 'Owner, repo, and path parameters are required' });
    }
    
    const repoDir = path.join(uploadDir, `${owner}-${repo}`);
    
    // Check if we have the repo metadata
    if (!fs.existsSync(path.join(repoDir, 'metadata.json'))) {
      return res.status(404).json({ error: 'Repository not found. Please link it first.' });
    }
    
    // Read metadata
    const metadata = JSON.parse(fs.readFileSync(path.join(repoDir, 'metadata.json'), 'utf8'));
    
    // If it's a mock repo, generate mock content
    if (metadata.isMock) {
      console.log(`Generating mock content for ${filePath}`);
      
      // Generate content based on file extension
      const fileExt = filePath.split('.').pop().toLowerCase();
      let content = '';
      
      if (fileExt === 'js' || fileExt === 'jsx') {
        const componentName = filePath.split('/').pop().split('.')[0];
        content = `// Mock JavaScript file: ${filePath}
import React from 'react';

// Component definition
function ${componentName}() {
  return (
    <div className="component">
      <h2>${componentName}</h2>
      <p>This is mock content for demonstration purposes.</p>
    </div>
  );
}

export default ${componentName};
`;
      } else if (fileExt === 'json') {
        content = `{
  "name": "${repo}",
  "version": "1.0.0",
  "description": "Mock package.json for ${owner}/${repo}",
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "start": "react-scripts start"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`;
      } else if (fileExt === 'md') {
        content = `# ${repo}

This is a mock README file for ${owner}/${repo}.

## Features
- Feature 1
- Feature 2

## Installation
\`\`\`
npm install
npm start
\`\`\`
`;
      } else {
        content = `// Mock content for ${filePath}
// This is a generated file for demonstration purposes.
`;
      }
      
      return res.status(200).json({
        path: filePath,
        content,
        isMock: true
      });
    }
    
    // If not mock, try to get from GitHub
    try {
      // Create GitHub client
      const enterpriseClient = axios.create({
        baseURL: 'GITHUB_URL_LINK',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` })
        },
        timeout: 5000
      });
      
      // Get file content
      const response = await enterpriseClient.get(`/repos/${owner}/${repo}/contents/${filePath}`);
      
      let content = '';
      if (response.data.encoding === 'base64') {
        content = Buffer.from(response.data.content, 'base64').toString('utf8');
      } else {
        content = response.data.content;
      }
      
      return res.status(200).json({
        path: filePath,
        content,
        sha: response.data.sha
      });
      
    } catch (error) {
      console.error('Error fetching file content:', error.message);
      
      // Return mock content as fallback
      console.log(`Generating fallback mock content for ${filePath}`);
      
      return res.status(200).json({
        path: filePath,
        content: `// Mock fallback content for ${filePath}\n// Could not fetch real content from GitHub`,
        isMock: true,
        error: error.message
      });
    }
    
  } catch (error) {
    console.error('Error getting file content:', error);
    res.status(500).json({ error: 'Failed to get file content: ' + error.message });
  }
});

// Endpoint to get files from a repository
app.get('/api/repo-files', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo parameters are required' });
    }
    
    const repoDir = path.join(uploadDir, `${owner}-${repo}`);
    
    // Check if we have the repo metadata
    if (!fs.existsSync(path.join(repoDir, 'metadata.json'))) {
      return res.status(404).json({ error: 'Repository not found. Please link it first.' });
    }
    
    // Read metadata
    const metadata = JSON.parse(fs.readFileSync(path.join(repoDir, 'metadata.json'), 'utf8'));
    
    res.status(200).json({
      owner,
      repo,
      files: metadata.files,
      isMock: !!metadata.isMock
    });
    
  } catch (error) {
    console.error('Error getting repository files:', error);
    res.status(500).json({ error: 'Failed to get repository files: ' + error.message });
  }
}); 