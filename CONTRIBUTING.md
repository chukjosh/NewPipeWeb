# Contributing to NewPipeWeb

Thanks for considering a contribution. This document covers how the project is organized and what to do before opening a pull request.

## Branches

- `dev` - active development happens here. All new work starts from `dev`.
- `main` - stable, released code. Only updated from `dev` once changes have been reviewed and tested.

Always branch off `dev`, and open your pull request against `dev`, not `main`.

## Getting started

See the main [README](./README.md) for prerequisites, running the app in development, and running it with Docker.

## Making a change

1. Fork the repo and create a branch off `dev`.
2. Make your changes.
3. Run the relevant build/checks before opening a PR (see below).
4. Open a pull request against `dev`, with a clear description of what the change does and why.
5. If your PR fixes an open issue, reference it in the description, e.g. `Fixes #12`.

## Before opening a PR

Please confirm the project actually builds with your changes:

- Backend: `cd backend && ./gradlew build`
- Frontend: `cd frontend && pnpm install && pnpm run build`

A PR that doesn't build will take longer to review and merge.

## Code style

- Use descriptive names for variables, functions, and types. Avoid cryptic abbreviations.
- Match the existing structure and conventions of the file you're editing rather than introducing a new pattern.
- Keep changes focused. If you find an unrelated bug while working on something else, open a separate issue or PR for it rather than bundling it in.

## Commit messages

Prefix commits with the type of change where it makes sense, for example:

- `feat: add download pause and resume controls`
- `fix: resolve shadowed thumbnailUrl in AddToPlaylistModal`
- `chore: update .gitignore for improved file exclusions`

## Reporting bugs

When opening an issue, please include:

- Steps to reproduce
- What you expected to happen vs what actually happened
- Environment details (Docker vs local dev, OS, browser if relevant)
- Relevant logs (`docker compose logs backend` / `docker compose logs frontend`), with any secrets removed

## Feature requests

Feature requests are welcome. If a request is broad, it may get split into smaller, separately trackable pieces so each can be reviewed and merged independently.

## Questions

If anything here is unclear, open an issue and ask.
