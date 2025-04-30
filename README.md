# AI Testing Platform

A comprehensive platform for generating, analyzing, and comparing unit tests using multiple AI models. This platform integrates various AI agents to generate unit tests, analyze code coverage, and provide comparative analysis of different LLM models' performance.

## Features

- **Multi-Model Test Generation**: Generate unit tests using different AI models (GPT-4, Claude, PaLM, Codex)
- **Coverage Analysis**: Get detailed coverage reports and metrics
- **Model Comparison**: Compare different AI models' performance in test generation
- **Real-time Analysis**: View test results and analysis in real-time
- **Interactive Dashboard**: Monitor and manage all testing activities

## Tech Stack

- **Frontend**: React, Material-UI, Chart.js
- **Backend**: Go (Gin framework)
- **AI Models**: OpenAI GPT-4, Anthropic Claude, Google PaLM, OpenAI Codex

## Prerequisites

- Node.js (v14 or higher)
- Go (v1.16 or higher)
- PostgreSQL
- Redis (optional, for caching)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-testing-platform.git
   cd ai-testing-platform
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   go mod download
   ```

4. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your configuration
   ```

5. Start the development servers:

   Frontend:
   ```bash
   cd frontend
   npm start
   ```

   Backend:
   ```bash
   cd backend
   go run main.go
   ```

## Usage

1. Access the platform at `http://localhost:3000`
2. Upload your source code file
3. Select the AI model(s) for test generation
4. View generated tests, coverage reports, and analysis
5. Compare different models' performance

## API Endpoints

### Test Generation
- `POST /api/generate-tests`: Generate unit tests
- `GET /api/test-results/:id`: Get test generation results

### Analysis
- `GET /api/analysis`: Get overall analysis
- `GET /api/coverage/:id`: Get coverage report

### Model Comparison
- `GET /api/model-comparison`: Get model comparison data
- `POST /api/compare-models`: Compare specific models

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for GPT-4 and Codex APIs
- Anthropic for Claude API
- Google for PaLM API
- The Go and React communities for excellent frameworks and tools 