// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const config = require('./config');
const { generateTestCases } = require('./utils/testGenerator');

const app = express();
const PORT = process.env.PORT || config.server.port;
const uploadDir = path.join(__dirname, config.uploads.directory);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(cors(config.server.cors));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || config.githubToken;

console.log('Using GitHub token:', GITHUB_TOKEN ? `${GITHUB_TOKEN.substring(0, 4)}...` : 'No token provided');

const githubAPI = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` })
  },
  timeout: 10000
});

const getGitHubClient = (repoUrl) => {
  if (repoUrl && !repoUrl.includes('github.com')) {
    const enterpriseUrl = new URL(repoUrl);
    return axios.create({
      baseURL: `${enterpriseUrl.protocol}//${enterpriseUrl.host}/api/v3`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` })
      },
      timeout: 10000
    });
  }
  return githubAPI;
};
const extractRepoDetails = (repoUrl) => {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /github\.([^\/]+)\.com\/([^\/]+)\/([^\/]+)/,
    /([^\/]+)\/([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      if (match.length > 3) {
        return { owner: match[2], repo: match[3], domain: match[1] };
      }
      return { owner: match[1], repo: match[2], domain: 'github.com' };
    }
  }
  
  throw new Error('Invalid GitHub repository URL format');
};

app.post('/api/generate-tests', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file:', req.file);
    console.log('Selected model:', req.body.model);
    
    const testId = 'test-' + Math.floor(Math.random() * 1000);
    let fileContent = '';
    if (req.file) {
      try {
        fileContent = fs.readFileSync(req.file.path, 'utf8');
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
  
    const useRepoContext = req.body.useRepoContext === 'true';
    let repoContext = null;
    
    if (useRepoContext) {
      const owner = req.body.repoOwner;
      const repo = req.body.repoName;
      const repoUrl = req.body.repoUrl;
      repoContext = { repoUrl, owner, repo };
      
      console.log('Using repository context:', repoContext);
      const repoDir = path.join(uploadDir, `${owner}-${repo}`);
      const metadataPath = path.join(repoDir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          repoContext.files = metadata.files || [];
          repoContext.defaultBranch = metadata.defaultBranch;
          const importRegex = /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([@\w\-/.]+)['"]/g;
          const requireRegex = /(?:const|let|var)\s+(?:{[^}]*}|\w+)\s+=\s+require\(['"]([@\w\-/.]+)['"]\)/g;
          
          const imports = new Set();
          let match;
  
          while ((match = importRegex.exec(fileContent)) !== null) {
            imports.add(match[1]);
          }
          
          // Extract CommonJS requires
          while ((match = requireRegex.exec(fileContent)) !== null) {
            imports.add(match[1]);
          }
          
          // Find the imported files in the repository
          const relatedFiles = [];
          const fileName = req.file.originalname;
          const fileExt = path.extname(fileName);
          const baseFileName = path.basename(fileName, fileExt);
          for (const file of metadata.files) {
            for (const importPath of imports) {
              if (importPath.startsWith('./') || importPath.startsWith('../')) {
                const normalizedImport = importPath.replace(/^\.\/|^\.\.\//, '');
                if (file.includes(normalizedImport)) {
                  relatedFiles.push(file);
                }
              }
              else {
                const moduleName = importPath.split('/')[0];
                if (file.includes(moduleName)) {
                  relatedFiles.push(file);
                }
              }
            }
            
            if (file.includes(baseFileName) && file !== fileName) {
              relatedFiles.push(file);
            }
            if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
              relatedFiles.push(file);
            }
          }
          repoContext.relatedFiles = Array.from(new Set(relatedFiles));
          repoContext.relatedContents = {};
          const githubClient = getGitHubClient(repoUrl);
          
          const relevantFiles = repoContext.relatedFiles.slice(0, 3);
          for (const file of relevantFiles) {
            try {
              const response = await githubClient.get(`/repos/${owner}/${repo}/contents/${file}`);
              if (response.data && response.data.content) {
                const content = Buffer.from(response.data.content, 'base64').toString('utf8');
                repoContext.relatedContents[file] = content;
              }
            } catch (error) {
              console.log(`Could not fetch content for ${file}:`, error.message);
            }
          }
        } catch (error) {
          console.error('Error loading repository metadata:', error);
        }
      }
    }
  
    const testResults = await generateTestCases(
      req.file ? req.file.originalname : 'unknown.js',
      fileContent,
      req.body.model,
      repoContext
    );
    const resultsPath = path.join(uploadDir, `${testId}-results.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  
    setTimeout(() => {
      res.json({
        message: 'Tests generated successfully',
        id: testId,
        fileName: req.file ? req.file.originalname : 'unknown',
        summary: testResults.summary
      });
    }, 2000);
  } catch (error) {
    console.error('Error generating tests:', error);
    res.status(500).json({ error: 'Failed to generate tests' });
  }
});

app.get('/api/test-results/:id', (req, res) => {
  const id = req.params.id;
  const resultsPath = path.join(uploadDir, `${id}-results.json`);
  
  if (fs.existsSync(resultsPath)) {
    try {
      const testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // Check if testCases exists and is an array before processing
      if (!testResults.testCases || !Array.isArray(testResults.testCases)) {
        return res.status(500).json({ 
          error: 'Test generation failed', 
          message: 'No test cases were generated. This may be due to an API error or configuration issue.' 
        });
      }
      
      let fullTestCode = '';
      const imports = new Set();
      const mocks = new Set();
      
      testResults.testCases.forEach(testCase => {
        const codeLines = testCase.code.split('\n');
        codeLines.forEach(line => {
          if (line.trim().startsWith('import ')) {
            imports.add(line);
          } else if (line.trim().startsWith('jest.mock(')) {
            let mockBlock = line;
            let i = codeLines.indexOf(line) + 1;
            while (i < codeLines.length && !codeLines[i].includes('));')) {
              mockBlock += '\n' + codeLines[i];
              i++;
            }
            if (i < codeLines.length && codeLines[i].includes('));')) {
              mockBlock += '\n' + codeLines[i];
            }
            mocks.add(mockBlock);
          }
        });
      });
      
      if (imports.size > 0) {
        fullTestCode += Array.from(imports).join('\n') + '\n\n';
      }
      if (mocks.size > 0) {
        fullTestCode += Array.from(mocks).join('\n\n') + '\n\n';
      }
      const setupCode = testResults.testCases.find(tc => 
        tc.code.includes('const renderComponent =') || 
        tc.code.includes('beforeEach(')
      );
      
      if (setupCode) {
        const setupLines = setupCode.code.split('\n').filter(line => 
          line.includes('const renderComponent =') || 
          line.includes('beforeEach(') ||
          line.includes('afterEach(')
        );
        if (setupLines.length > 0) {
          fullTestCode += setupLines.join('\n') + '\n\n';
        }
      }
    
      const filename = testResults.filename || 'Component';
      fullTestCode += `describe('${filename}', () => {\n`;
    
      testResults.testCases.forEach(testCase => {
        const codeLines = testCase.code.split('\n');
        const testLines = codeLines.filter(line => 
          !line.trim().startsWith('import ') && 
          !line.includes('jest.mock(') &&
          !line.includes('const renderComponent =') &&
          line.trim() !== ''
        );
        if (testLines.join(' ').includes('describe(')) {
          const describeStart = testLines.findIndex(line => line.includes('describe('));
          const content = testLines.slice(describeStart).join('\n');
          fullTestCode += `  ${content.replace(/\n/g, '\n  ')}\n\n`;
        } else {
          const testStart = testLines.findIndex(line => line.includes('test('));
          if (testStart >= 0) {
            const content = testLines.slice(testStart).join('\n');
            fullTestCode += `  ${content.replace(/\n/g, '\n  ')}\n\n`;
          }
        }
      });
      fullTestCode += '});\n';
      const analysis = {
        passedTests: testResults.testCases.filter(tc => tc.status === 'passed'),
        failedTests: testResults.testCases.filter(tc => tc.status === 'failed'),
        skippedTests: testResults.testCases.filter(tc => tc.status === 'skipped'),
        // Use summary data for accurate counts
        totalTestsCount: testResults.summary.total,
        passedTestsCount: testResults.summary.passed,
        failedTestsCount: testResults.summary.failed,
        skippedTestsCount: testResults.summary.skipped,
        executionTime: testResults.summary.executionTime,
        coverage: {
          lines: Math.floor(Math.random() * 20 + 80), // Simulated coverage
          branches: Math.floor(Math.random() * 30 + 70),
          functions: Math.floor(Math.random() * 15 + 85),
          statements: Math.floor(Math.random() * 25 + 75)
        },
        suggestions: [
          'Consider adding more edge case tests',
          'Test error handling scenarios',
          'Add integration tests for complex workflows'
        ]
      };
      
      res.json({
        ...testResults,
        fullTestCode,
        analysis
      });
    } catch (error) {
      console.error('Error reading test results:', error);
      res.status(500).json({ error: 'Failed to read test results' });
    }
  } else {
    res.status(404).json({ error: 'Test results not found' });
  }
});

app.get('/api/analysis', (req, res) => {
  res.json({
    coverage: 85,
    metrics: {
      passed: 42,
      failed: 3,
      skipped: 0,
      total: 45,
      duration: '2.5s',
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/coverage/:id', (req, res) => {
  const id = req.params.id;
  res.json({
    id,
    coverage: {
      lines: 85,
      functions: 90,
      branches: 75,
      statements: 88
    }
  });
});

app.get('/api/model-comparison', (req, res) => {
  res.json({
    models: ['GPT-4', 'Claude', 'PaLM', 'Codex'],
    metrics: {
      accuracy: [95, 92, 88, 90],
      coverage: [90, 88, 85, 87],
      speed: [85, 90, 92, 88],
      consistency: [92, 90, 85, 86]
    }
  });
});

app.post('/api/compare-models', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file for comparison:', req.file);
    console.log('Selected models:', req.body.models);
    let fileContent = '';
    if (req.file) {
      try {
        fileContent = fs.readFileSync(req.file.path, 'utf8');
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
    const comparisonId = 'comparison-' + Math.floor(Math.random() * 1000);
    const models = Array.isArray(req.body.models) ? req.body.models : [req.body.models];
    
    const modelResults = {};
    for (const model of models) {
      const testResults = await generateTestCases(
        req.file ? req.file.originalname : 'unknown.js',
        fileContent,
        model
      );
      modelResults[model] = testResults;
    }
    
    const resultsPath = path.join(uploadDir, `${comparisonId}-results.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(modelResults, null, 2));
    
    setTimeout(() => {
      res.json({
        message: 'Model comparison completed',
        id: comparisonId,
        fileName: req.file ? req.file.originalname : 'unknown',
        models: Object.keys(modelResults)
      });
    }, 3000);
  } catch (error) {
    console.error('Error in model comparison:', error);
    res.status(500).json({ error: 'Failed to compare models' });
  }
});

app.get('/api/compare-results/:id', (req, res) => {
  const id = req.params.id;
  const resultsPath = path.join(uploadDir, `${id}-results.json`);
  
  if (fs.existsSync(resultsPath)) {
    try {
      const comparisonResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      res.json({
        id,
        status: 'completed',
        results: comparisonResults
      });
    } catch (err) {
      console.error('Error reading comparison results:', err);
      res.status(500).json({ error: 'Failed to read comparison results' });
    }
  } else {
    res.status(404).json({ error: 'Comparison results not found' });
  }
});

app.post('/api/link-repository', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    console.log('Attempting to link repository:', repoUrl);
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    let repoDetails;
    try {
      repoDetails = extractRepoDetails(repoUrl);
      console.log('Extracted repo details:', repoDetails);
    } catch (error) {
      console.error('Error extracting repo details:', error.message);
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }
    
    const { owner, repo, domain } = repoDetails;
    const repoDir = path.join(uploadDir, `${owner}-${repo}`);
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    
    const githubClient = getGitHubClient(repoUrl);
    const repoApiUrl = `/repos/${owner}/${repo}`;
    console.log('Calling GitHub API:', githubClient.defaults.baseURL + repoApiUrl);
    
    let repoMetadata;
    let usedFallback = false;
    
    try {
      console.log('Testing GitHub API connection...');
      const testResponse = await githubClient.get('/');
      console.log('GitHub API connection successful. Rate limit:', testResponse.headers['x-ratelimit-remaining']);
      console.log('Fetching repository details...');
      const repoResponse = await githubClient.get(repoApiUrl);
      console.log('Repository details fetched successfully');
      const repoData = repoResponse.data;
      
      console.log('Fetching branches...');
      const branchesResponse = await githubClient.get(`/repos/${owner}/${repo}/branches`);
      const branches = branchesResponse.data.map(branch => branch.name);
      const defaultBranch = repoData.default_branch || 'main';
      console.log('Default branch:', defaultBranch);
      
      console.log('Fetching file tree...');
      const contentsResponse = await githubClient.get(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
      
      let files = [];
      if (contentsResponse.data.tree) {
        files = contentsResponse.data.tree
          .filter(item => item.type === 'blob')
          .map(item => item.path);
        console.log(`Found ${files.length} files in repository`);
      } else {
        console.warn('No tree data found in response');
      }
      
      // Store repository metadata
      repoMetadata = {
        owner,
        repo,
        url: repoUrl,
        clonedAt: new Date().toISOString(),
        files,
        branches,
        defaultBranch,
        lastCommit: contentsResponse.data.sha
      };
      
    } catch (error) {
      console.error('Error fetching from GitHub API:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received. Network error.');
      }
      
      // Check for specific GitHub API errors
      let errorMsg = "Could not access GitHub repository.";
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMsg = "Authentication failed. Please check GitHub token.";
        } else if (error.response.status === 403) {
          errorMsg = "API rate limit exceeded or insufficient permissions.";
        } else if (error.response.status === 404) {
          errorMsg = "Repository not found. Please check URL and permissions.";
        }
      } else {
        errorMsg = "Network error. Could not connect to GitHub. " + error.message;
      }
      
      // Fallback: Create simulated repository data
      usedFallback = true;
      repoMetadata = {
        owner,
        repo,
        url: repoUrl,
        clonedAt: new Date().toISOString(),
        files: [
          'src/components/Button.js',
          'src/components/Card.js',
          'src/utils/helpers.js',
          'src/services/api.js',
          'tests/components/Button.test.js',
          'package.json',
          'README.md'
        ],
        branches: ['main', 'develop'],
        defaultBranch: 'main',
        lastCommit: '8a7d3c1f5b6e9d0a2c4b8e7f6d5a3c2b1d0e9f8a',
        note: `Using simulated data. GitHub API access failed: ${errorMsg}`
      };
    }
    
    // Save metadata for future use
    fs.writeFileSync(
      path.join(repoDir, 'metadata.json'),
      JSON.stringify(repoMetadata, null, 2)
    );
    
    const responseObj = { success: true, repoData: repoMetadata };
    
    if (usedFallback) {
      responseObj.warning = 'Using simulated repository data. Could not access GitHub API.';
      responseObj.fallbackReason = repoMetadata.note;
    }
    
    res.status(200).json(responseObj);
    
  } catch (error) {
    console.error('Error linking repository:', error);
    res.status(500).json({ error: 'Failed to link repository: ' + error.message });
  }
});

// Endpoint to get repository files
app.get('/api/repo-files', async (req, res) => {
  try {
    const { owner, repo, path: filePath = '' } = req.query;
    
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
    
    // Filter files based on path prefix
    const items = [];
    const pathPrefix = filePath === '' ? '' : (filePath.endsWith('/') ? filePath : filePath + '/');
    
    // Get all unique first-level entries at the current path
    const uniqueEntries = new Set();
    
    metadata.files.forEach(file => {
      if (file.startsWith(pathPrefix)) {
        const remainingPath = file.substring(pathPrefix.length);
        const firstSegment = remainingPath.split('/')[0];
        
        if (firstSegment && !uniqueEntries.has(firstSegment)) {
          uniqueEntries.add(firstSegment);
          
          // Check if it's a directory or file
          const isDirectory = remainingPath.includes('/');
          items.push({
            name: firstSegment,
            path: pathPrefix + firstSegment,
            type: isDirectory ? 'directory' : 'file'
          });
        }
      }
    });
    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
    
    res.status(200).json({
      owner,
      repo,
      path: pathPrefix,
      items
    });
    
  } catch (error) {
    console.error('Error fetching repository files:', error);
    res.status(500).json({ error: 'Failed to fetch repository files' });
  }
});

app.get('/api/repo-file-content', async (req, res) => {
  try {
    const { owner, repo, path: filePath } = req.query;
    
    if (!owner || !repo || !filePath) {
      return res.status(400).json({ error: 'Owner, repo, and path parameters are required' });
    }
    
    const repoDir = path.join(uploadDir, `${owner}-${repo}`);
  
    if (!fs.existsSync(path.join(repoDir, 'metadata.json'))) {
      return res.status(404).json({ error: 'Repository not found. Please link it first.' });
    }
    const metadata = JSON.parse(fs.readFileSync(path.join(repoDir, 'metadata.json'), 'utf8'));
    
    const githubClient = getGitHubClient(metadata.url);
    
    try {
      const response = await githubClient.get(`/repos/${owner}/${repo}/contents/${filePath}`);
      
      let content = '';
      if (response.data.encoding === 'base64') {
        content = Buffer.from(response.data.content, 'base64').toString('utf8');
      } else {
        content = response.data.content;
      }
      
      res.status(200).json({
        path: filePath,
        content,
        sha: response.data.sha
      });
      
    } catch (error) {
      console.error('Error fetching file content:', error.response?.data || error.message);
      res.status(200).json({
        path: filePath,
        content: `// Mock content for ${filePath}\n// Could not fetch real content from GitHub`,
        isMock: true
      });
    }
    
  } catch (error) {
    console.error('Error getting file content:', error);
    res.status(500).json({ error: 'Failed to get file content' });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File uploads will be stored in: ${uploadDir}`);
}); 