# Contributing to YouTube Search

First off, thank you for considering contributing to YouTube Search! It's people like you who make this library better for everyone.

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🛠️ Development Environment Setup

To set up your development environment:

1. **Fork and Clone**: Fork the repository on GitHub and clone it to your local machine.
2. **Install Dependencies**: While the library has zero external dependencies, you may want to run `npm install` if any dev-dependencies are added in the future.
3. **Local Server**: We recommend using a local development server like `http-server` or `live-server` to serve `index.html` and avoid CORS issues with local file paths.

## 🔄 Workflow

### 1. Branching
- Create a new branch for each feature or bug fix.
- Use descriptive branch names: `feature/your-feature-name` or `bugfix/issue-number`.
- Always branch off from the latest `main`.

### 2. Commits
- We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- Examples:
    - `feat: add support for channel search`
    - `fix: resolve caching issue in localStorage`
    - `docs: update README with new examples`

### 3. Pull Requests
- Ensure your branch is up to date with `main`.
- Provide a clear and concise description of the changes.
- Link any related issues using `Fixes #123`.
- Ensure all tests pass before submitting.

### 4. Reviews
- All PRs require at least one maintainer review.
- Be prepared to address feedback and make changes if necessary.

## 💻 Coding Standards

- **Modern ES6+**: Use modern JavaScript features (const/let, arrow functions, destructuring, etc.).
- **ES Modules**: Always use `import/export` syntax.
- **Documentation**: Use JSDoc for all classes and methods.
- **Zero Dependencies**: Keep the library lightweight by avoiding external runtime dependencies.
- **Privacy**: Never include API keys or sensitive data in your commits.

## 🧪 Testing Requirements

We use a simple `test.js` pattern for verification:
- Before submitting a PR, create or update a `test.js` file at the root to verify your changes.
- Ensure both success and error paths are covered.
- Visual verification via `index.html` is also encouraged for UI-related changes.

## 🐛 Reporting Issues

- Use the GitHub Issues tab.
- Provide a clear title and description.
- Include steps to reproduce the issue.
- Mention your environment (browser version, OS).

Thank you for your contribution!
