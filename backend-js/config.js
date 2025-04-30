/**
 * Configuration file for the application
 * This file contains application settings and sensitive information
 * that should not be committed to version control.
 */

module.exports = {
  githubToken: process.env.GITHUB_TOKEN || '',
  
  // Server configuration
  server: {
    port: process.env.PORT || 8081,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  },
  
  uploads: {
    directory: 'uploads',
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
}; 