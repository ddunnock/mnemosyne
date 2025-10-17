# Contributing to Mnemosyne

Thank you for your interest in contributing to Mnemosyne! We welcome contributions from the community and are excited to work with you to make this the best AI agent platform for Obsidian.

## 🌟 How to Contribute

There are many ways to contribute to Mnemosyne:

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new functionality
- 📝 **Improve documentation** - Help make our docs clearer and more comprehensive
- 🔧 **Write code** - Fix bugs, implement features, or improve performance
- 🧪 **Test** - Help test new features and report issues
- 🎨 **Design** - Contribute UI/UX improvements and design assets

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0+
- **npm** 9.0+
- **Obsidian** 1.4.0+
- **Git** (latest version)
- **TypeScript** knowledge (helpful)
- **React** familiarity (for UI contributions)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/mnemosyne.git
   cd mnemosyne
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/dunnock/mnemosyne.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Create a test vault** in Obsidian for development

6. **Link the plugin** to your test vault:
   ```bash
   # Create symlink (adjust path to your test vault)
   ln -s $(pwd) /path/to/test-vault/.obsidian/plugins/mnemosyne
   ```

7. **Start development**:
   ```bash
   npm run dev
   ```

8. **Enable the plugin** in your test vault's Community Plugins settings

## 🔄 Development Workflow

### Branch Strategy

- **`main`** - Stable, production-ready code
- **`develop`** - Integration branch for new features
- **`feature/feature-name`** - Individual feature branches
- **`fix/issue-description`** - Bug fix branches
- **`docs/topic`** - Documentation updates

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Create a Pull Request** on GitHub

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- **`feat:`** - New features
- **`fix:`** - Bug fixes
- **`docs:`** - Documentation changes
- **`style:`** - Code style changes (formatting, etc.)
- **`refactor:`** - Code refactoring
- **`test:`** - Test additions or modifications
- **`chore:`** - Build process or auxiliary tool changes

Examples:
```
feat: add Ollama local AI provider support
fix: resolve memory leak in vector store
docs: update installation instructions
style: format code with prettier
refactor: simplify agent execution logic
test: add unit tests for encryption manager
chore: update dependencies
```

## 📋 Code Standards

### TypeScript

- **Strict typing** - No `any` types (use `unknown` if needed)
- **Interfaces over types** - Prefer interfaces for object shapes
- **JSDoc comments** - Document public APIs and complex logic
- **Error handling** - Proper error boundaries and typed errors

### React Components

- **Functional components** - Use hooks instead of class components
- **TypeScript props** - Properly type all component props
- **Accessibility** - Follow WCAG 2.1 AA guidelines
- **Performance** - Use React.memo, useMemo, useCallback appropriately

### Code Style

- **ESLint** - All code must pass linting
- **Prettier** - Consistent code formatting
- **File naming** - camelCase for files, PascalCase for components
- **Import order** - External imports first, then internal

### Testing

- **Unit tests** - Test individual functions and components
- **Integration tests** - Test component interactions
- **E2E tests** - Test user workflows (coming soon)
- **Coverage** - Aim for >80% test coverage

Example test structure:
```typescript
describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    // Setup test environment
  });

  describe('createAgent', () => {
    it('should create agent with valid config', () => {
      // Test implementation
    });

    it('should throw error with invalid config', () => {
      // Error case testing
    });
  });
});
```

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. macOS 14.1]
- Obsidian version: [e.g. 1.4.16]
- Plugin version: [e.g. 1.2.3]
- Node.js version (if developing): [e.g. 18.17.0]

**Additional context**
Add any other context about the problem here.

**Console logs**
If applicable, include relevant console error messages.
```

## 💡 Feature Requests

For feature requests, please use this template:

### Feature Request Template

```markdown
**Is your feature request related to a problem? Please describe.**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions you've considered.

**Use cases**
Describe specific use cases for this feature.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🔍 Code Review Process

All contributions go through code review:

### What We Look For

- **Functionality** - Does the code work as intended?
- **Tests** - Are there appropriate tests?
- **Documentation** - Is the code well-documented?
- **Performance** - Are there any performance implications?
- **Security** - Are there any security concerns?
- **Compatibility** - Does it work across supported platforms?

### Review Timeline

- Initial response: **Within 48 hours**
- Full review: **Within 1 week**
- Complex features may take longer

## 📚 Documentation

### Types of Documentation

- **README.md** - Project overview and quick start
- **API documentation** - JSDoc comments in code
- **User guides** - Step-by-step tutorials
- **Developer guides** - Architecture and contributing info

### Documentation Standards

- **Clear language** - Write for your audience
- **Examples** - Include code examples and screenshots
- **Up-to-date** - Keep docs in sync with code changes
- **Searchable** - Use clear headings and structure

## 🏗️ Architecture

### Project Structure

```
mnemosyne/
├── src/
│   ├── agents/          # AI agent system
│   ├── encryption/      # Security and key management
│   ├── integration/     # Obsidian and external integrations
│   ├── llm/            # Language model providers
│   ├── rag/            # Retrieval-augmented generation
│   ├── types/          # TypeScript type definitions
│   ├── ui/             # React user interface
│   └── utils/          # Utility functions
├── tests/              # Test files
├── docs/               # Documentation
└── styles/             # CSS and styling
```

### Key Principles

- **Modularity** - Clear separation of concerns
- **Testability** - Easy to test components
- **Performance** - Efficient algorithms and lazy loading
- **Security** - Secure by default
- **Accessibility** - Usable by everyone

## 🚦 Release Process

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (1.1.0) - New features, backward compatible
- **PATCH** (1.1.1) - Bug fixes, backward compatible

### Release Cycle

- **Patch releases** - As needed for critical bugs
- **Minor releases** - Monthly for new features
- **Major releases** - Quarterly or for significant changes

## 🤝 Community

### Code of Conduct

We're committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Getting Help

- **GitHub Discussions** - Ask questions and discuss ideas
- **GitHub Issues** - Report bugs and request features
- **Discord** - Real-time chat with the community (coming soon)

### Recognition

We appreciate all contributions! Contributors are recognized in:
- **README.md** acknowledgments
- **Release notes** for significant contributions
- **Hall of Fame** (coming soon)

## 📞 Contact

- **Maintainer**: David Dunnock
- **Email**: [Contact through GitHub](https://github.com/dunnock)
- **GitHub**: [@dunnock](https://github.com/dunnock)

## 📝 License

By contributing to Mnemosyne, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

Thank you for contributing to Mnemosyne! Together, we're building the future of intelligent knowledge management. 🚀