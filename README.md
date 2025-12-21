# TextMate Grammar Test
[![CI][ci-badge]][ci-status]
[![npm version][npm-badge]][npm-link]
[![npm updated][npm-date-badge]][npm-link]

Write unit or snapshot tests for TextMate grammars validated against the VS Code TextMate engine.


## Why this fork exists
The original [vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test) seems no longer maintained.
This fork addresses key points like dependency updates, technical debt and reported bugs.
Please be aware that there might be breaking changes with the old behaviour.


## Installation
```sh
npm install --save-dev textmate-grammar-test
```


## Unit Testing
<!-- TODO example -->

This section describes the syntax for writing unit tests.

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


### Require token to have a specific scope
<!-- TODO cleanup -->
Require tokens to have specific scope by using `^`&nbsp;&nbsp;:

```scala
private var elements: List[A] = Nil
//          ^^^^^^^^ variable.other.declaration.scala
```

Get into those pesky first few characters by using `<-`:

```scala
var x = 3
// <--- keyword.declaration.volatile.scala
//  the length of '-' determine how many characters are matched from the start of the line
x=5
//  <~- keyword.operator.comparison.scala
//  you specify offset from start by using '~' character, just in case
```


### Prevent scope on a token
<!-- TODO cleanup -->
* To ensure that tokens **don't** have undesired scopes put `-` symbol before them:
```scala
  / ensure comment start with two double slashes
  ^ - comment.line.double slash.scala

  / or you can combine both positive and negative scopes
  ^ source.scala - comment.line.double slash.scala
```

Lines which start with a `<comment token>` and assertion symbol are ignored by the textmate grammar.


Note, that scope comparison takes into account relative scope's position.
So, if required scopes are `'scope1 scope2'`, the test will report an error if a grammar returns them as `'scope2 scope1'`.

To run a unit test:
```bash
textmate-grammar-test 'tests/unit/**/*.test.scala'
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


## Command Line Options
Unit tests:
```
Usage: textmate-grammar-test [options] <testcases...>

Run Textmate grammar test cases using vscode-textmate

Arguments:
  testcases                      A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!

Options:
  -g, --grammar <grammar>          Path to a grammar file. Multiple options supported. 'scopeName' is taken from the grammar (default: [])
  --config <configuration.json>    Path to the language configuration, package.json by default
  -c, --compact                    Display output in the compact format, which is easier to use with VSCode problem matchers
  --xunit-report <report.xml>      Path to directory where test reports in the XUnit format will
                                   be emitted in addition to console output
  --xunit-format <generic|gitlab>  Format of XML reports generated when --xunit-report is used.
                                   `gitlab` format is suitable for viewing the results in GitLab
  -V, --version                    output the version number
  -h, --help                       display help for command
```

Snapshot tests:
```
Usage: textmate-grammar-snap [options] <testcases...>

Run VSCode textmate grammar snapshot tests

Arguments:
  testcases                      A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!

Options:
  -u, --updateSnapshot           overwrite all snap files with new changes
  --config <configuration.json>  Path to the language configuration, package.json by default
  --printNotModified             include not modified scopes in the output (default: false)
  --expandDiff                   produce each diff on two lines prefixed with "++" and "--" (default: false)
  -g, --grammar <grammar>        Path to a grammar file. Multiple options supported. 'scopeName' is taken from the grammar (default: [])
  -s, --scope <scope>            Explicitly specify scope of testcases, e.g. source.dhall
  -V, --version                  output the version number
  -h, --help                     display help for command
```

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
