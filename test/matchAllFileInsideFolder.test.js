import { sep } from "path"
import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { matchAllFileInsideFolder } from "../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const specifierMetaMap = {
  "/*.js": {
    source: true,
  },
  "/subfolder/": {
    source: true,
  },
}
const matchingFileResultArray = await matchAllFileInsideFolder({
  folderPath: `${testFolderPath}${sep}folder`,
  specifierMetaMap,
  predicate: ({ source }) => source,
})
const actual = matchingFileResultArray.map(({ relativePath }) => relativePath).sort()
const expected = ["/a.js", "/b.js", "/subfolder/c.json"]

assert({
  actual,
  expected,
})
