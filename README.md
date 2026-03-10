# TextMate Grammar Test
[![CI][ci-badge]][ci-status]
[![npm version][npm-badge]][npm-link]
[![npm updated][npm-date-badge]][npm-link]

Write unit and snapshot tests for TextMate grammars,
validated against the VS Code TextMate engine.


## 📦 Installation
```sh
npm install --save-dev textmate-grammar-test
```


### 🔄 Migrating from `vscode-tmgrammar-test`
Looking for up-to-date dependencies, cleaner and fully refactored codebase,
plus additional bug fixes and features?

Migration is straightforward and should only take a few minutes:

- Install the new package: `npm i -D textmate-grammar-test`
- Replace occurrences of
  - `vscode-tmgrammar-test` -> `textmate-grammar-test`
  - `vscode-tmgrammar-snap` -> `textmate-grammar-snap`
- Newer versions include a few minor breaking changes. For migration notes see:
  - [0.3.0](CHANGELOG.md#breaking-changes-in-030)
  - [0.5.0](CHANGELOG.md#breaking-changes-in-050)


## 🚀 Usage
> [!NOTE]
> Spaces are recommended indentation for test files.

This package provides the commands `textmate-grammar-test` and `textmate-grammar-snap`.

Add a package.json script like:
```json
"scripts": {
  "test:grammar": "npx textmate-grammar-test syntax/tests/**/*.foo"
}
```

To see all available command line options, run:
```sh
npx textmate-grammar-test --help
# or
npx textmate-grammar-snap --help
```

## 📸 Snapshot Testing
Snapshot tests are a simple and fast way to test your grammar.

1. Create small source files for your test cases
1. Run `npx textmate-grammar-snap "tests/**/*.foo"`
2. Review the generated `.snap` files
3. Commit them to your version control

After grammar changes, update snapshots and review the diffs:
```sh
npx textmate-grammar-snap --updateSnapshot "tests/**/*.foo"
```


## 🧩 Unit Testing Syntax
<!-- TODO small collapsible glossar -->


### File Header
Every test file must start with a header line in the format
`<comment token> SYNTAX TEST "<scopeName>" "Optional description"`.

For example:
```ts
// SYNTAX TEST "source.ts" "Example header for a TypeScript grammar test"
```


### Require specific scopes
Assert that a token has a specific scope using `^`:
```ts
let count: number = 1
//  ^^^^^ variable.other.readwrite.ts
//         ^^^^^^ support.type.primitive.ts
```

You can also assert multiple scopes on the same token.
Scopes must be ordered from most general to most specifc:
```ts
let count: number = 1
//         ^^^^^^ meta.type.annotation.ts meta.var-single-variable.expr.ts meta.var.expr.ts
```


### Prevent specific scopes
To ensure a token does not receive an unexpected scope,
use `!` (surrounded by spaces):
```ts
    / not a comment
//  ^ ! comment.line.double-slash.ts
```

Positive and negative assertions can be combined.
The `!` is only needed to separate the groups:
```ts
    / not a comment
//  ^ source.ts ! comment.line.double-slash.ts storage.type.ts
```


### Test the first token of a line
To target a token at the start of a line, use `<-`.
The number of `-` characters defines the token length.

If an offset is needed, use `~`:
```ts
let x = "a"
// <--- storage.type.ts

// With offset:
x = "b"
// <~~- keyword.operator.assignment.ts
```




## Language configuration via package.json
Needed information about the grammars is read from the `package.json` contribution points `contributes.grammars` and `contributes.languages`.

If it's not in your project root, provide the path with the `--config` option.

You can also pass the path to a custom json file imitating the structure.


## Setup VSCode unit test task
<!-- TODO test and rework this section -->
You can setup a vscode unit test task for convenience:

```json
{
  "label": "Run tests",
  "type": "shell",
  "command": "textmate-grammar-test -c -g testcase/dhall.tmLanguage.json '**/*.dhall'",
  "group": "test",
  "presentation": {
    "reveal": "always",
    "panel":"new",
  },
  "problemMatcher": {
    "owner": "textmate-grammar-test",
    "fileLocation": [
      "relative",
      "${workspaceFolder}",
    ],
    "pattern": [
      {
        "regexp": "^(ERROR)\\s([^:]+):(\\d+):(\\d+):(\\d+)\\s(.*)$",
        "severity": 1,
        "file": 2,
        "line": 3,
        "column": 4,
        "endColumn": 5,
        "message": 6,
      },
    ],
  },
},
```

Notice the `-c` option that will output messages in a handy format for the problemMatcher.


## 📜 License
This repo is licensed under the [MIT License](LICENSE.txt).


<!-- links -->
[ci-badge]: https://github.com/serkonda7/textmate-grammar-test/actions/workflows/ci.yml/badge.svg
[ci-status]: https://github.com/serkonda7/textmate-grammar-test/actions/workflows/ci.yml
[npm-badge]: https://nodei.co/npm/textmate-grammar-test.png?style=shields&data=v&color=blue
[npm-date-badge]: https://nodei.co/npm/textmate-grammar-test.png?style=shields&data=u&color=blue
[npm-link]: https://www.npmjs.com/package/textmate-grammar-test
