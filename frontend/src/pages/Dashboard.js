import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Code as CodeIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { testService } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalFiles: 0,
    totalTests: 0,
    averageCoverage: 0,
    activeModels: 4,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const lastTestId = localStorage.getItem('lastTestId');
      if (lastTestId) {
        const testResults = await testService.getTestResults(lastTestId);
        const coverage = await testService.getCoverage(lastTestId);
        const totalFiles = localStorage.getItem('totalFilesAnalyzed') || '0';
        const filesCount = parseInt(totalFiles) || 1;
        localStorage.setItem('totalFilesAnalyzed', filesCount.toString());
        const totalTests = testResults.testCases?.length || 0;
        const avgCoverage = coverage?.coverage ? 
          Math.round(
            (coverage.coverage.lines + 
             coverage.coverage.functions + 
             coverage.coverage.branches + 
             coverage.coverage.statements) / 4
          ) : 0;
        
        setDashboardData({
          totalFiles: filesCount,
          totalTests,
          averageCoverage: avgCoverage,
          activeModels: 4, // Static for now
        });
      } else {
        // If no test has been run yet, show default values
        setDashboardData({
          totalFiles: 0,
          totalTests: 0,
          averageCoverage: 0,
          activeModels: 4,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <CodeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography variant="h4">{dashboardData.totalFiles}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Files Analyzed
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                  <Typography variant="h4">{dashboardData.totalTests}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tests Generated
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <TimelineIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  <Typography variant="h4">{dashboardData.averageCoverage}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Coverage
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  <Typography variant="h4">{dashboardData.activeModels}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active AI Models
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate('/test-generator')}
                    startIcon={<CodeIcon />}
                    size="large"
                    sx={{ py: 1.5 }}
                  >
                    Generate New Tests
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/comparison')}
                    startIcon={<TimelineIcon />}
                    size="large"
                    sx={{ py: 1.5 }}
                  >
                    Compare Models
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* System Status */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'success.light', 
                      color: 'success.dark',
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="h6">All Systems Operational</Typography>
                    <Typography variant="body2">
                      AI models are running at optimal capacity
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'info.light', 
                      color: 'info.dark',
                      textAlign: 'center' 
                    }}
                  >
                    <Typography variant="h6">API Status: Online</Typography>
                    <Typography variant="body2">
                      Backend API is responding normally
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard; 