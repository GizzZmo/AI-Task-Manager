# Contributing to Sentinel AI Task Manager

Thank you for your interest in contributing to Sentinel AI Task Manager! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI-Task-Manager.git
   cd AI-Task-Manager
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.local.example .env.local
   # Add your GEMINI_API_KEY to .env.local
   ```

## Development Workflow

### Running the Web Application

```bash
npm run dev
```

Navigate to http://localhost:3000 to see the app.

### Running the Desktop Application

In separate terminals:

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Launch Electron
npm run electron:dev
```

### Building

```bash
# Build web assets
npm run build

# Build desktop application
npm run electron:build
```

## Code Style

- Use TypeScript for all new code
- Follow existing code style and conventions
- Run builds to check for TypeScript errors before committing
- Keep components focused and modular
- Add comments for complex logic

## Roadmap Priorities

We're following the roadmap in README.md. Current priorities:

1. ✅ Electron scaffolding (complete)
2. 🚧 Native Windows process APIs integration
3. 🚧 Process control (terminate, suspend, spawn)
4. Security enrichment with Authenticode checks
5. File system integration and screenshot capture
6. Offline support and settings persistence
7. Auto-updater and distribution

## Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, focused commits

3. **Test your changes**:
   - Ensure the app builds successfully
   - Test web and desktop versions
   - Verify no TypeScript errors
   - Mirror CI locally where possible: `npm run native:build && npm run build` (same checks as `.github/workflows/ci.yml`)

4. **Update documentation** if needed:
   - Update README.md for user-facing changes
   - Update ELECTRON.md for integration details
   - Add comments for complex code

5. **Submit a pull request**:
   - Provide a clear description of changes
   - Reference any related issues
   - Explain why the change is needed

## Reporting Issues

- Use GitHub Issues to report bugs or suggest features
- Include clear steps to reproduce bugs
- Provide environment details (OS, Node version, etc.)
- Check for existing issues before creating new ones

## Security

- Never commit API keys or secrets
- Follow Electron security best practices
- Report security vulnerabilities privately to the maintainer

## Questions?

Feel free to open an issue for questions or reach out to the maintainer.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
