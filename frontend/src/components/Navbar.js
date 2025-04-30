import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CodeIcon from '@mui/icons-material/Code';
import CompareIcon from '@mui/icons-material/Compare';

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Testing Platform
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            startIcon={<DashboardIcon />}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/test-generator"
            startIcon={<CodeIcon />}
          >
            Generate Tests
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/comparison"
            startIcon={<CompareIcon />}
          >
            Compare LLMs
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 