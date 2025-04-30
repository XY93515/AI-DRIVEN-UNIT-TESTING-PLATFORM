import axios from 'axios';

const API_URL = 'http://localhost:8081/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const testService = {
  generateTests: async (fileData, model, repoContext = null) => {
    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('model', model);
    
    // Add repository context if provided
    if (repoContext) {
      formData.append('useRepoContext', 'true');
      formData.append('repoUrl', repoContext.repoUrl);
      formData.append('repoOwner', localStorage.getItem('repoOwner'));
      formData.append('repoName', localStorage.getItem('repoName'));
    }
    
    const response = await apiClient.post('/generate-tests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getTestResults: async (id) => {
    const response = await apiClient.get(`/test-results/${id}`);
    return response.data;
  },
  
  getCoverage: async (id) => {
    const response = await apiClient.get(`/coverage/${id}`);
    return response.data;
  },
  
  linkRepository: async (repoUrl) => {
    const response = await apiClient.post('/link-repository', { repoUrl });
    return response.data;
  },
  
  getRepoFiles: async (owner, repo, path = '') => {
    const response = await apiClient.get(`/repo-files?owner=${owner}&repo=${repo}&path=${path}`);
    return response.data;
  },
  
  getRepoFileContent: async (owner, repo, path) => {
    const response = await apiClient.get(`/repo-file-content?owner=${owner}&repo=${repo}&path=${path}`);
    return response.data;
  }
};

export const comparisonService = {
  getModelComparison: async () => {
    const response = await apiClient.get('/model-comparison');
    return response.data;
  },
  
  compareModels: async (models, file, repoContext = null) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Handle array of models
    if (Array.isArray(models)) {
      models.forEach(model => formData.append('models[]', model));
    } else {
      formData.append('models[]', models);
    }
    
    // Add repository context if provided
    if (repoContext) {
      formData.append('useRepoContext', 'true');
      formData.append('repoUrl', repoContext.repoUrl);
      formData.append('repoOwner', localStorage.getItem('repoOwner'));
      formData.append('repoName', localStorage.getItem('repoName'));
    }
    
    const response = await apiClient.post('/compare-models', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getComparisonResults: async (id) => {
    const response = await apiClient.get(`/compare-results/${id}`);
    return response.data;
  },
};

export default {
  testService,
  comparisonService,
}; 