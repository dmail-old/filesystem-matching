# Filesystem matching

[![npm package](https://img.shields.io/npm/v/@dmail/filesystem-matching.svg)](https://www.npmjs.com/package/@dmail/filesystem-matching)
[![ci status](https://github.com/dmail/filesystem-matching/workflows/ci/badge.svg)](https://github.com/dmail/filesystem-matching/actions)
[![codecov](https://codecov.io/gh/dmail/filesystem-matching/branch/master/graph/badge.svg)](https://codecov.io/gh/dmail/filesystem-matching)

> Collect a subset of files inside a folder.

## Example

```console
npm install @dmail/filesystem-matching
```

With the following file structure:

```
root/
  src/
    file.js
  index.js
  package.json
```

Executing code below:

```js
const { matchAllFileInsideFolder } = require(" @dmail/filesystem-matching")

const matchingFileResult = await matchAllFileInsideFolder({
  folderPath: __dirname,
  metaDescription: {
    "/**/*.js": {
      type: "js",
    },
    "/**/*.json": {
      type: "json",
    },
  },
  predicate: ({ type }) => extension === "js",
})
console.log(matchingFileResult.map(({ relativePath }) => relativePath))
```

logs:

```json
["/index.js", "/src/file.js"]
```

## `matchAllFileInsideFolder`

> Async function returning the subset of files you want from a folder.

This function takes several option documented below.

## folderPath option

> path to the root folder possibly containing files.

This option is **required**.<br />
It is compatible with backslashes in case you're on windows.

## metaDescription option

> Object associating meta to path using patterns.

This option is **required**.<br />
Each key is a pattern.<br />
Each value is an object representing meta associated to this pattern.<br />
You can test how pattern matches a path in a dedicated page.<br />
— see [pattern and pathname matching playground](https://dmail.github.io/project-structure/interactive-example/interactive-example.html)

For instance the following `metaDescription`

```json
{
  "/**/*.js": {
    "type": "js"
  },
  "/**/*.json": {
    "type": "json"
  }
}
```

Associates `{ "type": "js" }` to any file ending with `.js` inside 0 or more subfolder and `{ "type": "json" }` to any file ending with `.json` inside 0 or more subfolder.

## predicate(meta)

> Function receiving meta associated to a given file. If it returns true, the file will be considered as matching.

This option is **required**.

For every file, all pattern matching the file path are collected.<br />
Then, all meta associated to matching patterns are composed into a single object passed to `predicate`.

It means the following `metaDescription`

```json
{
  "/**/*": {
    "shared": 42
  },
  "/**/*.js": {
    "type": "js"
  }
}
```

Calls

```js
predicate({ shared: 42, type: "js" })
```

for every file ending with `.js` inside your folder.

## matchingFileOperation({ cancellationToken, relativePath, meta, lstat })

> Async function called on every matching file.

This function can be used to perform operation on files as soon as they matches.<br />
Without this option you have to wait `matchAllFileInsideFolder` to get the list of matching files.<br />
`matchingFileOperation` return value is awaited and available in every matching file under the property `operationResult`.

If you don't pass this option, default value is:

```js
const matchingFileOperation = () => null
```
