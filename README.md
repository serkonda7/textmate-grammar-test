# TextMate Grammar Test
[![CI][ci-badge]][ci-status]
[![npm version][npm-badge]][npm-link]
[![npm updated][npm-date-badge]][npm-link]

Write unit and snapshot tests for TextMate grammars validated against the VS Code TextMate engine.


## Why this fork exists
The original [vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test) is no longer maintained.

This fork has updated dependencies, a refactored code base and of course additional bug fixes and features.


### Migrating
Migration from the old package is easy:
- `npm install --save-dev textmate-grammar-test@~0.2.9`
- Change all `vscode-tmgrammar-test` to `textmate-grammar-test`
- Change all `vscode-tmgrammar-snap` to `textmate-grammar-snap`
- Done

> [!IMPORTANT]
> Version `0.3.0` will introduce some breaking changes (for details, see the [changelog](CHANGELOG.md)).


## Installation
```sh
npm install --save-dev textmate-grammar-test
```


## Usage
THis package provides the commands `textmate-grammar-test` and `textmate-grammar-snap`.

Add a package.json script like:
```json
"scripts": {
  "test:grammar": "npx textmate-grammar-test syntax/tests/**/*.foo"
}
```

To see all available command line options, run
```sh
npx textmate-grammar-test --help
# or
npx textmate-grammar-snap --help
```


## Unit Testing Syntax
<!-- TODO example -->
<!-- TODO small collapsible glossar -->


### File Header
All tests must start with a header line:
```
<comment token> SYNTAX TEST "<scopeName>" "Optional description"
```

Example (TypeScript):
```ts
// SYNTAX TEST "source.ts" "Example header for a TypeScript grammar test"
```


### Require specific scopes
Require tokens to have a specific scope by using `^`:
```ts
let count: number = 1
//  ^^^^^ variable.other.readwrite.ts
//         ^^^^^^ support.type.primitive.ts
```

You can test for multiple scopes too. The order must be from general scope to more specifc:
```ts
let count: number = 1
//         ^^^^^^ meta.type.annotation.ts meta.var-single-variable.expr.ts meta.var.expr.ts
```


### Prevent specific scopes
To ensure tokens don't have a unexpected scope, add a `!` surrounded by spaces:
```ts
    / not a comment
//  ^ ! comment.line.double-slash.ts
```

You can combine positive and negative scopes too. The `!` is only needed to separate the groups:
```ts
    / not a comment
//  ^ source.ts ! comment.line.double-slash.ts storage.type.ts
```


### Test the first token of a line
To test a token at the beginning of the line, use `<-`.
The number of `-` determines the token length.
In case you need an offset, use `~`:
```ts
let x = "a"
// <--- storage.type.ts

// With offset:
x = "b"
// <~~- keyword.operator.assignment.ts
```


## Snapshot tests
<!-- TODO rewrite and cleanup -->
Snapshot tests are like `functional tests` but you don't have to write outputs explicitly.
All you have to do is to provide a source files, scopes of which you want to test. Then on
the first run `textmate-grammar-snap` will generate a set of `.snap` files which are an
instant snapshot of lines of the source files together with corresponding scopes.

Then if you change the grammar and run the test again, the program will output the changes between
the `.snap` file and the real output.
If you satisfied with the changes you can `commit` them by running
```bash
textmate-grammar-snap --updateSnapshot ....
```
this will overwrite the existing `.snap` files with a new ones.
After this you should commit them alongside with the source code test cases.

You can read more about them at [snapshot testing](https://jestjs.io/docs/en/snapshot-testing)

To run snapshot test:
```bash
textmate-grammar-snap 'tests/snap/**/*.scala'
```

## Language configuration via package.json
<!-- TODO rewrite and cleanup, possibly remove -->
The configuration follows the format of vscode:

```json
{
  "contributes": {
      "languages": [
          {
              "id": "scala",
              "extensions": [
                  ".scala",
                  ".sbt",
                  ".sc"
              ]
          }
      ],
      "grammars": [
          {
              "language": "scala",
              "scopeName": "source.scala",
              "path": "./syntaxes/Scala.tmLanguage.json"
          }
      ]
  }
}
```
The idea is that for the average language extension all necessary information for tests are already included in the `package.json`.
It is optional, though. If the configuration is missing it is necessary to specify grammars and scopeName of testcases via command line options.

Right now only regular grammars and *Injection Grammars* via `injectTo` directive are supported.


## Setup VSCode unit test task
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


<!-- links -->
[ci-badge]: https://github.com/serkonda7/textmate-grammar-test/actions/workflows/ci.yml/badge.svg
[ci-status]: https://github.com/serkonda7/textmate-grammar-test/actions/workflows/ci.yml
[npm-badge]: https://nodei.co/npm/textmate-grammar-test.png?style=shields&data=v&color=blue
[npm-date-badge]: https://nodei.co/npm/textmate-grammar-test.png?style=shields&data=u&color=blue
[npm-link]: https://www.npmjs.com/package/textmate-grammar-test
