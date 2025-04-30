import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  ListItemIcon,
  LinearProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkIcon from '@mui/icons-material/Link';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { testService } from '../services/api';

const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'claude', name: 'Claude' },
  { id: 'codex', name: 'Codex' },
];

function TestGenerator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [loading, setLoading] = useState(false);
  const [generatedTests, setGeneratedTests] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Repository linking
  const [useRepoContext, setUseRepoContext] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoLinked, setRepoLinked] = useState(false);
  const [repoFiles, setRepoFiles] = useState([]);
  const [repoLinking, setRepoLinking] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [fullTestCode, setFullTestCode] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleRepoUrlChange = (event) => {
    setRepoUrl(event.target.value);
  };
  
  const handleUseRepoToggle = () => {
    setUseRepoContext(!useRepoContext);
  };
  
  const handleLinkRepo = async () => {
    if (!repoUrl) return;
    
    setRepoLinking(true);
    setRepoError('');
    
    try {
      // Extract repo information - support custom domains
      const repoRegex = /github(?:\.[a-zA-Z0-9-]+)*\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoUrl.match(repoRegex);
      
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }
      
      const [_, owner, repo] = match;
      
      // Call the API to link the repository
      const response = await testService.linkRepository(repoUrl);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to link repository');
      }
      
      // Store repository data in state
      setRepoFiles(response.repoData.files || []);
      setRepoLinked(true);
      
      // Save repository info to localStorage
      localStorage.setItem('linkedRepo', repoUrl);
      localStorage.setItem('repoOwner', owner);
      localStorage.setItem('repoName', repo);
    } catch (error) {
      console.error('Error linking repository:', error);
      setRepoError(error.message || 'Failed to link repository');
    } finally {
      setRepoLinking(false);
    }
  };

  const handleGenerateTests = async () => {
    if (!selectedFile || !selectedModel) return;

    setLoading(true);
    setError('');
    setGeneratedTests([]);
    setSummary(null);
    setCoverage(null);
    
    try {
      // Create repository context if enabled
      let repoContext = null;
      if (useRepoContext && repoLinked) {
        repoContext = {
          repoUrl,
          repoOwner: localStorage.getItem('repoOwner'),
          repoName: localStorage.getItem('repoName')
        };
      }
      
      // Call API to generate tests
      const result = await testService.generateTests(
        selectedFile, 
        selectedModel, 
        repoContext
      );
      
      // Save the test ID to localStorage for use in the Analysis page
      localStorage.setItem('lastTestId', result.id);
      
      // Increment the total files analyzed count
      const currentCount = localStorage.getItem('totalFilesAnalyzed') || '0';
      const newCount = parseInt(currentCount) + 1;
      localStorage.setItem('totalFilesAnalyzed', newCount.toString());
      
      // Get test results using the returned ID
      const testResults = await testService.getTestResults(result.id);
      
      // Get coverage for the test
      const coverageData = await testService.getCoverage(result.id);
      
      setGeneratedTests(testResults.testCases || []);
      setSummary(testResults.summary || result.summary);
      setCoverage(coverageData.coverage);
      
      // Store the full test code if available
      if (testResults.fullTestCode) {
        setFullTestCode(testResults.fullTestCode);
      }
      
      // Store the analysis if available
      if (testResults.analysis) {
        setAnalysis(testResults.analysis);
      }
      
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error generating tests:', error);
      setError('Failed to generate tests. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Get test case status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get test case status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Generate Unit Tests
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            
            {/* File Upload Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Upload Source File
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                fullWidth
              >
                Upload File
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept=".js,.ts,.go,.py"
                />
              </Button>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {selectedFile.name}
                </Typography>
              )}
            </Box>
            
            {/* Repository Context Section */}
            <Box sx={{ mb: 3, mt: 4 }}>
              <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                Repository Context
                <Tooltip title="Linking a repository helps the AI understand the broader project context, leading to more accurate tests">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={useRepoContext} 
                    onChange={handleUseRepoToggle}
                    color="primary"
                  />
                }
                label="Use repository context"
                sx={{ mb: 2 }}
              />
              
              {useRepoContext && (
                <>
                  <TextField
                    fullWidth
                    label="GitHub Repository URL"
                    variant="outlined"
                    value={repoUrl}
                    onChange={handleRepoUrlChange}
                    placeholder="https://github.com/username/repo or custom domain"
                    sx={{ mb: 2 }}
                    disabled={repoLinked}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <GitHubIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  {!repoLinked ? (
                    <Button
                      variant="outlined"
                      onClick={handleLinkRepo}
                      startIcon={repoLinking ? <CircularProgress size={20} /> : <LinkIcon />}
                      disabled={!repoUrl || repoLinking}
                      fullWidth
                    >
                      Link Repository
                    </Button>
                  ) : (
                    <>
                    <Alert 
                      icon={<CheckCircleIcon fontSize="inherit" />} 
                      severity="success"
                      sx={{ mb: 2 }}
                    >
                      Repository linked successfully
                    </Alert>
                      
                      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Repository Context Benefits
                        </Typography>
                        <List dense disablePadding>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Accurate imports & dependencies"
                              secondary="Detects project-specific libraries & components"
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="PropTypes detection"
                              secondary="Correctly mocks required component props"
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Follows test conventions"
                              secondary="Uses your project's testing patterns & utilities"
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Related file analysis"
                              secondary="Examines related components & services"
                            />
                          </ListItem>
                        </List>
                      </Paper>
                    </>
                  )}
                  
                  {repoError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {repoError}
                    </Alert>
                  )}
                  
                  {repoLinked && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Repository Browser
                      </Typography>
                      <RepoBrowser 
                        owner={localStorage.getItem('repoOwner')}
                        repo={localStorage.getItem('repoName')}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>AI Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={handleModelChange}
                label="AI Model"
              >
                {AI_MODELS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateTests}
              disabled={!selectedFile || !selectedModel || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              fullWidth
            >
              Generate Tests
            </Button>

            {summary && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Test Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                      <Typography variant="body2" color="text.secondary">
                        Passed
                      </Typography>
                      <Typography variant="h4" color="success.dark">
                        {summary.passed}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                      <Typography variant="body2" color="text.secondary">
                        Failed
                      </Typography>
                      <Typography variant="h4" color="error.dark">
                        {summary.failed}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                      <Typography variant="body2" color="text.secondary">
                        Skipped
                      </Typography>
                      <Typography variant="h4" color="warning.dark">
                        {summary.skipped}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="h4" color="info.dark">
                        {summary.total}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Complete Test" />
                <Tab label="Individual Tests" />
                <Tab label="Analysis" />
                {coverage && <Tab label="Coverage Report" />}
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <Box>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <CircularProgress />
                  </Box>
                ) : !fullTestCode ? (
                  <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No tests generated yet. Upload a file and select an AI model to begin.
                    {useRepoContext && !repoLinked && " Link a repository for better context."}
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Complete Test File
                    </Typography>
                    
                    {useRepoContext && repoLinked && (
                      <Alert 
                        severity="info" 
                        sx={{ mb: 2 }}
                        icon={<InfoIcon />}
                      >
                        This test code was enhanced using repository context to improve accuracy and reliability.
                      </Alert>
                    )}
                    
                    <TextField
                      fullWidth
                      multiline
                      variant="outlined"
                      value={fullTestCode}
                      minRows={15}
                      maxRows={30}
                      InputProps={{
                        readOnly: true,
                        style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                      }}
                    />
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<ContentCopyIcon />}
                        onClick={() => {
                          navigator.clipboard.writeText(fullTestCode);
                          // Show a small snackbar notification
                          setSnackbarOpen(true);
                          setError('');
                        }}
                      >
                        Copy to Clipboard
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <CircularProgress />
                  </Box>
                ) : generatedTests.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No tests generated yet. Upload a file and select an AI model to begin.
                    {useRepoContext && !repoLinked && " Link a repository for better context."}
                  </Typography>
                ) : (
                  <List>
                    {generatedTests.map((test, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              {getStatusIcon(test.status)}
                              <Typography sx={{ ml: 1 }}>{test.name}</Typography>
                              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={test.status} 
                                  color={getStatusColor(test.status)} 
                                  size="small" 
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {test.executionTime}
                                </Typography>
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <TextField
                              fullWidth
                              multiline
                              variant="outlined"
                              value={test.code}
                              InputProps={{
                                readOnly: true,
                                style: { fontFamily: 'monospace' }
                              }}
                            />
                            {test.error && (
                              <Box sx={{ mt: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                                <Typography variant="body2" color="error">
                                  Error: {test.error}
                                </Typography>
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {tabValue === 2 && analysis && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Test Analysis
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Passed Tests ({analysis.passedTests.length})
                      </Typography>
                      {analysis.passedTests.length > 0 ? (
                        <List dense>
                          {analysis.passedTests.map((test, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <CheckCircleIcon color="success" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={test.name} 
                                secondary={`Execution time: ${test.executionTime}`} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary">No tests passed</Typography>
                      )}
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Failed Tests ({analysis.failedTests.length})
                      </Typography>
                      {analysis.failedTests.length > 0 ? (
                        <List dense>
                          {analysis.failedTests.map((test, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <ErrorIcon color="error" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={test.name} 
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2">
                                      Error: {test.error || "Unknown error"}
                                    </Typography>
                                    <br />
                                    <Typography component="span" variant="body2" color="text.secondary">
                                      Execution time: {test.executionTime}
                                    </Typography>
                                  </>
                                } 
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary">No tests failed</Typography>
                      )}
                    </Paper>
                  </Grid>
                  
                  {analysis.skippedTests && analysis.skippedTests.length > 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Skipped Tests ({analysis.skippedTests.length})
                        </Typography>
                        <List dense>
                          {analysis.skippedTests.map((test, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <WarningIcon color="warning" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={test.name} 
                                secondary={test.reason || "No reason provided"} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Execution Summary
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Total Execution Time:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {analysis.executionTime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          Test Results Distribution
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="buffer"
                              value={(analysis.passedTests.length / (analysis.passedTests.length + analysis.failedTests.length + (analysis.skippedTests?.length || 0))) * 100}
                              valueBuffer={((analysis.passedTests.length + (analysis.skippedTests?.length || 0)) / (analysis.passedTests.length + analysis.failedTests.length + (analysis.skippedTests?.length || 0))) * 100}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'success.main',
                                },
                                '& .MuiLinearProgress-dashed': {
                                  backgroundImage: 'none',
                                  backgroundColor: 'warning.main',
                                },
                                backgroundColor: 'error.light',
                              }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 1 }} />
                            <Typography variant="caption">Passed: {analysis.passedTests.length}</Typography>
                          </Box>
                          {analysis.skippedTests && analysis.skippedTests.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main', mr: 1 }} />
                              <Typography variant="caption">Skipped: {analysis.skippedTests.length}</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 1 }} />
                            <Typography variant="caption">Failed: {analysis.failedTests.length}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tabValue === 3 && coverage && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Coverage Report
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(coverage).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="h5" sx={{ color: value > 80 ? 'success.main' : value > 60 ? 'warning.main' : 'error.main' }}>
                            {value}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Coverage Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Lines" 
                        secondary={`${coverage.lines}% (${Math.round(coverage.lines * 0.85)} / ${Math.round(coverage.lines * 1)})`} 
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText 
                        primary="Functions" 
                        secondary={`${coverage.functions}% (${Math.round(coverage.functions * 0.9)} / ${Math.round(coverage.functions * 1)})`} 
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText 
                        primary="Branches" 
                        secondary={`${coverage.branches}% (${Math.round(coverage.branches * 0.75)} / ${Math.round(coverage.branches * 1)})`} 
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText 
                        primary="Statements" 
                        secondary={`${coverage.statements}% (${Math.round(coverage.statements * 0.88)} / ${Math.round(coverage.statements * 1)})`} 
                      />
                    </ListItem>
                  </List>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert 
          onClose={handleSnackbarClose} 
          severity={error ? "error" : "success"} 
          sx={{ width: '100%' }}
        >
          {error || "Tests generated successfully!"}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Repository Browser Component
function RepoBrowser({ owner, repo }) {
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  
  useEffect(() => {
    if (owner && repo) {
      loadPath('');
    }
  }, [owner, repo]);
  
  const loadPath = async (path) => {
    setLoading(true);
    setError('');
    setSelectedFile(null);
    setFileContent('');
    
    try {
      const response = await testService.getRepoFiles(owner, repo, path);
      setItems(response.items || []);
      setCurrentPath(path);
    } catch (err) {
      console.error('Error loading repository path:', err);
      setError('Failed to load repository files');
    } finally {
      setLoading(false);
    }
  };
  
  const handleItemClick = async (item) => {
    if (item.type === 'directory') {
      loadPath(item.path + '/');
    } else {
      // For files, fetch file content
      setSelectedFile(item);
      setLoadingFile(true);
      
      try {
        const response = await testService.getRepoFileContent(owner, repo, item.path);
        setFileContent(response.content || '');
      } catch (err) {
        console.error('Error loading file content:', err);
        setFileContent(`// Error loading file content for ${item.path}`);
      } finally {
        setLoadingFile(false);
      }
    }
  };
  
  const handleBreadcrumbClick = (index) => {
    if (index === 0) {
      loadPath('');
    } else {
      const pathParts = currentPath.split('/').filter(p => p);
      const newPath = pathParts.slice(0, index).join('/') + '/';
      loadPath(newPath);
    }
  };
  
  // Get file icon based on file extension
  const getFileIcon = (fileName) => {
    if (!fileName.includes('.')) return "📄"; // Default document icon
    
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js':
        return "🟨"; // Yellow for JavaScript
      case 'jsx':
        return "🟦"; // Blue for JSX
      case 'ts':
      case 'tsx':
        return "🟦"; // Blue for TypeScript
      case 'json':
        return "📋"; // JSON
      case 'md':
        return "📝"; // Markdown
      case 'css':
      case 'scss':
      case 'less':
        return "🎨"; // Styling
      case 'html':
        return "🌐"; // HTML
      case 'py':
        return "🐍"; // Python
      case 'go':
        return "🔵"; // Go
      default:
        return "📄"; // Default document
    }
  };
  
  // Generate breadcrumbs from the current path
  const breadcrumbs = [
    { label: owner + '/' + repo, path: '' },
    ...currentPath.split('/').filter(p => p).map((part, index, parts) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/') + '/'
    }))
  ];
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
      <Paper 
        variant="outlined" 
        sx={{ p: 1, height: selectedFile ? '50%' : '100%', overflow: 'auto' }}
      >
        {/* Breadcrumb navigation */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 1, alignItems: 'center', bgcolor: 'background.paper', p: 0.5, borderRadius: 1 }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Typography sx={{ mx: 0.5 }}>/</Typography>}
              <Typography
                variant="body2"
                sx={{ 
                  cursor: 'pointer', 
                  color: 'primary.main',
                  fontWeight: 'medium',
                  '&:hover': { textDecoration: 'underline' } 
                }}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {crumb.label}
              </Typography>
            </React.Fragment>
          ))}
        </Box>
        
        {loading ? (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>
        ) : items.length === 0 ? (
          <Typography variant="body2" sx={{ p: 1, color: 'text.secondary' }}>
            No files found in this directory
          </Typography>
        ) : (
          <List dense>
            {items.map((item, index) => (
              <ListItem 
                key={index} 
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  bgcolor: selectedFile?.path === item.path ? 'action.selected' : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
                onClick={() => handleItemClick(item)}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                        {item.type === 'directory' ? '📁' : getFileIcon(item.name)}
                      </Typography>
                      {item.type === 'directory' ? 
                        <Typography variant="body2" color="primary.main" fontWeight="medium">{item.name}/</Typography> :
                        <Typography variant="body2" color={selectedFile?.path === item.path ? 'primary.main' : 'text.primary'}>
                          {item.name}
                        </Typography>
                      }
                    </Box>
                  } 
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      
      {/* File content preview */}
      {selectedFile && (
        <Paper variant="outlined" sx={{ p: 1, mt: 1, height: '50%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {selectedFile.path}
            </Typography>
          </Box>
          
          {loadingFile ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={fileContent}
              InputProps={{
                readOnly: true,
                style: { 
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': { padding: 1 },
                height: 'calc(100% - 30px)'
              }}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}

export default TestGenerator; 