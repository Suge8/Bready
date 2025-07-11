# Contributing to Bready

Thank you for your interest in contributing to Bready! We welcome contributions from everyone.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- macOS (for system audio features)
- Git
- Gemini API key

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/Bready.git
   cd Bready
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Add your Gemini API key to .env.local
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## 📝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Suge8/Bready/issues)
2. If not, create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Node.js version)
   - Screenshots if applicable

### Suggesting Features

1. Check [Issues](https://github.com/Suge8/Bready/issues) for existing feature requests
2. Create a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach

### Code Contributions

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   npm run build
   npm run test
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide proper type annotations
- Use interfaces for object types

### React

- Use functional components with hooks
- Follow React best practices
- Use meaningful component names
- Keep components small and focused

### Styling

- Use Tailwind CSS for styling
- Follow the existing design system
- Use semantic class names
- Maintain responsive design

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### Code Review Process

1. All PRs require review before merging
2. Address review feedback promptly
3. Keep PRs focused and reasonably sized
4. Update documentation as needed

## 🧪 Testing

- Write tests for new features
- Ensure existing tests pass
- Use Playwright for E2E testing
- Test on macOS (primary platform)

## 📚 Documentation

- Update README.md for user-facing changes
- Update TECHNICAL.md for technical changes
- Add JSDoc comments for complex functions
- Keep CHANGELOG.md updated

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

## 🎯 Priority Areas

We especially welcome contributions in:

- Cross-platform support (Windows, Linux)
- Performance optimizations
- UI/UX improvements
- Documentation improvements
- Test coverage
- Accessibility features

## 📞 Getting Help

- Create an issue for questions
- Join discussions in GitHub Discussions
- Check existing documentation

Thank you for contributing to Bready! 🍞
