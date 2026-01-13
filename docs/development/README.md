# Development & Contributing Guide

Learn how to contribute to the YouTube Search Library and set up your development environment.

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ and npm
- Git
- A code editor (VS Code recommended)

### Setup

1. **Fork and clone** the repository:
```bash
git clone https://github.com/YOUR-USERNAME/yt-search-lib.git
cd yt-search-lib
```

2. **Install dependencies**:
```bash
npm install
```

3. **Run the build**:
```bash
npm run build
```

4. **Run tests**:
```bash
npm run test
```

## 📋 Contribution Process

### Before You Start

- Read [Code of Conduct](../community/code-of-conduct.md)
- Check [Contributing Guide](./contributing.md)
- Look at existing [GitHub Issues](https://github.com/luongnv89/yt-search-lib/issues)
- Check [GitHub Discussions](https://github.com/luongnv89/yt-search-lib/discussions)

### Making Changes

1. **Create a feature branch**:
```bash
git checkout -b feature/my-feature
```

2. **Make your changes** following [Code Standards](./code-standards.md)

3. **Test your changes**:
```bash
npm run test
npm run lint
```

4. **Commit with clear message**:
```bash
git commit -m "feat: add my feature"
```

5. **Push and create PR**:
```bash
git push origin feature/my-feature
```

## 📚 Development Guides

- **[Setup Guide](./setup.md)** - Local development environment
- **[Testing](./testing.md)** - Writing and running tests
- **[Code Standards](./code-standards.md)** - ESLint, formatting, conventions
- **[Building](./building.md)** - Build process and output
- **[Releasing](./releasing.md)** - Publishing to npm

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run integration tests
npm run test:integration:proxy

# Run with proxy
npm run proxy:start
```

## 🔨 Build & Lint

```bash
# Build the library
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 📦 Project Structure

```
yt-search-lib/
├── src/
│   ├── index.js          # Main export
│   ├── lib/
│   │   ├── cache.js      # LRU cache implementation
│   │   ├── constants.js  # API constants
│   │   ├── parser.js     # Response parsing
│   │   └── transport.js  # Network layer
│   └── types.js          # Type definitions
├── docs/                 # Documentation
├── test/                 # Tests
├── dist/                 # Built files
└── package.json          # Dependencies
```

## 🎯 Common Tasks

### Add a new feature
1. Create feature branch
2. Update src/ with new code
3. Add tests in test/
4. Update documentation
5. Submit PR

### Fix a bug
1. Create issue if not exists
2. Create bugfix branch
3. Fix the issue with tests
4. Submit PR with issue reference

### Update documentation
1. Update relevant .md files
2. Test that links work
3. Submit PR

## 💡 Tips

- **Use meaningful commit messages** - Helps track changes
- **Write tests** - Ensure your code works
- **Follow code standards** - Maintain consistency
- **Update docs** - Help other developers
- **Ask questions** - Open issues or discussions

## 🔗 Related Resources

- **[Contributing Guide](./contributing.md)** - Contribution workflow
- **[Code Standards](./code-standards.md)** - Code conventions
- **[Testing Guide](./testing.md)** - Test patterns
- **[Community](../community/README.md)** - Community guidelines
- **[Main Documentation](../README.md)** - Back to docs

## 📞 Need Help?

- **Setup issues?** → See [Setup Guide](./setup.md)
- **Testing help?** → See [Testing Guide](./testing.md)
- **Code questions?** → Open [GitHub Discussion](https://github.com/luongnv89/yt-search-lib/discussions)
- **Found a bug?** → Create [GitHub Issue](https://github.com/luongnv89/yt-search-lib/issues)

---

**← [Back to Documentation](../README.md)**
