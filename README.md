AI Testing Platform
A comprehensive platform for generating, analyzing, and comparing unit tests using multiple AI models. This platform integrates various AI agents to generate unit tests, analyze code coverage, and provide comparative analysis of different LLM models' performance.

Features
Multi-Model Test Generation: Generate unit tests using different AI models (GPT-4, Claude, PaLM, Codex)
Coverage Analysis: Get detailed coverage reports and metrics
Model Comparison: Compare different AI models' performance in test generation
Real-time Analysis: View test results and analysis in real-time
Interactive Dashboard: Monitor and manage all testing activities
Tech Stack
Frontend: React, Material-UI, Chart.js
Backend: Node.js, Express
AI Models: OpenAI GPT-4, Anthropic Claude, OpenAI Codex
Prerequisites
Node.js (v14 or higher)
npm or yarn
API keys for AI models you plan to use
Installation and Setup
Clone the repository

Set up the backend:

cd backend-js
npm install
Configure API tokens (one of these options):

Add all the below mentioned tokens in .env file:

GITHUB_TOKEN=your_github_token_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=8081
Set up the frontend:

cd ../frontend
npm install
Start the development servers:

Backend:

cd backend-js
node server.js
Frontend:

cd frontend
npm start
Usage
Access the platform at http://localhost:3000
Upload your source code file
Select the AI model(s) for test generation
View generated tests, coverage reports, and analysis
Compare different models' performance
API Endpoints
Test Generation
POST /api/generate-tests: Generate unit tests
GET /api/test-results/:id: Get test generation results
Analysis
GET /api/analysis: Get overall analysis
GET /api/coverage/:id: Get coverage report
Model Comparison
GET /api/model-comparison: Get model comparison data
POST /api/compare-models: Compare specific models
