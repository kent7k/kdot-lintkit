# @kent7k/lintkit-markdownlint

Wrapper around `markdownlint-cli` with a shared config.

## CLI

- `lintkit-markdownlint check [globs...]`
- `lintkit-markdownlint write [globs...]` (adds `--fix`)
- Pass extra options after `--` to forward to markdownlint-cli.

Default config is bundled and applied unless `--config` is provided.
