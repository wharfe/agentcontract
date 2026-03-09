# Contributing to agentcontract

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/wharfe/agentcontract.git
cd agentcontract
npm install
```

## Scripts

| Command | Description |
|---|---|
| `npm run typecheck` | Type check without emitting |
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
feat(core): add new assertion type
fix(cli): correct YAML parsing error
docs: update README examples
chore: update dependencies
```

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Ensure `npm run typecheck` and `npm test` pass
5. Commit using Conventional Commits format
6. Open a pull request

## Reporting Issues

Please use [GitHub Issues](https://github.com/wharfe/agentcontract/issues).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
