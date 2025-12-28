# Changelog
## 0.3.0
_unreleased_

**Breaking Changes**
- Character for negative scope tests is now `!` (before: `-`)
- Failure exit code is now `1` (before: `-1`)
- Remove (the undocumented) support for multiple assertions in one line, e.g. `^^  ^^^ source.xy`
  - Workaround: split into multiple lines
- Removed `--version` argument. You better control this via package.json

**Other Changes**
- readme: Clarify testing syntax
- Change internal error handling to Result type instead of throwing
- unit/parser: Complete code overhaul and refactor
- Replace mocha/chai with bun:test


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
