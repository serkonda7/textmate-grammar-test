# Changelog
## 0.4.0
_unreleased_

### Breaking Changes in 0.4.0
- snapshot: Remove `--scope` option
  - Scopes are now taken from package.json or the file specified with `--config`


## 0.3.3
_2026-01-16_

- unit: Fix incorrect EOL error for entire lines that only have the root scope
- snap: Adjust `.snap` file format to pass unit tests
- Dependency updates


## 0.3.2
_2026-01-07_

- unit: Fix incorrect test result reporting caused by concurrency
- unit: Remove concurreny entirely due to negligible performance gain


## 0.3.0 - 0.3.1
_2026-01-05_

### Breaking Changes in 0.3.0
- Negative scope assertions now use `!` (before: `-`)
- Failure exit code is now `1` (before: `-1`)
- Removed undocumented support for multiple assertions in one line, e.g. `^^  ^^^ source.xy`
  - Workaround: split into multiple lines
- Removed `--version` flag. You can check this in your package.json
- Fix incomplete EOL check if assertion starts on token

### Other Changes
- Add `--scope-parser permissive` to support scopes containing symbols
- readme: Clarify testing syntax
- Replaced exception-based error handling with a Result type
- Refactored lot's of code, especially the assertion parser
- Replaced `mocha/chai` with `bun:test`


## 0.2.8 - 0.2.9
_2025-12-19_

- Fix execution with npx/bunx
- ci: Enable windows testing
- fix: Windows-related fixes


## 0.2.2 - 0.2.7
_2025-12-17_

- refac(deps): Replace Bottleneck with p-limit
- test(deps): Replace xml2js with fast-xml-parser
- build: Replace pnpm with bun
- build: Replace eslint and prettier with biome
- chore(deps): Update chalk, diff


## 0.2.1
_2025-12-09_

- build: Replace npm with pnpm
- build(deps): Upgrade glob, TypeScript, Node and VS Code dependencies
- build(ci): Check linting
- build: Replace tslint with eslint
- test: Remove nyc coverage reports
- docs: Readd readme badges


## 0.2.0
_2025-12-08_

- Name changed to `textmate-grammar-test`
- Inital release after forking from [PanAeon/vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test)
