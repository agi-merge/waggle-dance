# Contributing to Waggle🐝💃Dance

## ⚠️ Under Construction ⚠️

Thank you for your interest in contributing to Waggle🐝💃Dance! We welcome contributions from the community to help make this project even better. This document outlines the contribution pattern we follow. Please take a moment to review this information before making your contribution.

## ✅ Getting Started

1. Fork the Waggle🐝💃Dance repository.

2. Clone your forked repository to your local machine:

```bash
git clone https://github.com/your-username/[Project Name].git
```

3. Follow instructions for 🏃 How to Run on the main [README](./README.md).

## 📩 Submitting a Contribution

Follow these steps to submit your contribution:

1. Create a new branch for your contribution:

```bash
git checkout -b feature/your-feature-name
```

2. Make the necessary changes and commit them:

```bash
git add .
git commit -m "Add your commit message here"
```

3. Push your branch to your forked repository:

```bash
git push origin feature/your-feature-name
```

4. Open a pull request from your forked repository to the main repository.

5. Wait for the project maintainers to review and merge your pull request.

## 🛣️ Code Guidelines

- Follow the existing code style and conventions.

- Write meaningful commit messages that describe the changes made.

- Ensure your code is well-documented and includes necessary comments.

- Run the provided linting and formatting scripts before committing your changes.

- Test build locally to ensure pre-build/build scripts don't trip any critical errors: `SKIP_ENV_VALIDATION=true NODE_ENV=production  pnpm turbo build lint type-check`

CI will run this command on your PR, so it's best to run it locally before submitting.

## 😱 Issue Guidelines

- Before submitting a new issue, please search the issue tracker to check if a similar issue already exists.

- Clearly describe the problem or feature request in the issue, including steps to reproduce if applicable.

- Provide any relevant details or context that can help in resolving the issue.

## 🦜 Communication

- Join our community on [Discord](https://discord.gg/Rud2fR3hAX) to get help or discuss the project.

## 📃 License

By contributing to Waggle🐝💃Dance, you agree that your contributions will be licensed under the MIT license.

We appreciate your contributions and support in making Waggle🐝💃Dance better! Together, let's build an amazing open-source community.
