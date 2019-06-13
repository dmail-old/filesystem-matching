import { readdir, lstat } from "fs"
import {
  operatingSystemPathToPathname,
  pathnameToOperatingSystemPath,
  pathnameToRelativePathname,
} from "@jsenv/operating-system-path"
import { createCancellationToken, createOperation } from "@dmail/cancellation"
import { pathnameCanContainsMetaMatching, pathnameToMeta } from "@dmail/project-structure"

export const matchAllFileInsideFolder = async ({
  cancellationToken = createCancellationToken(),
  folderPath,
  metaDescription,
  predicate,
  transformFile = (file) => file,
}) => {
  if (typeof folderPath !== "string")
    throw new TypeError(`folderPath must be a string, got ${folderPath}`)
  if (typeof metaDescription !== "object")
    throw new TypeError(`metaDescription must be a object, got ${metaDescription}`)
  if (typeof predicate !== "function")
    throw new TypeError(`predicate must be a function, got ${predicate}`)
  if (typeof transformFile !== "function")
    throw new TypeError(`transformFile must be a function, got ${transformFile}`)

  const results = []
  const rootFolderPathname = operatingSystemPathToPathname(folderPath)
  const visitFolder = async (folderPathname) => {
    const folderPath = pathnameToOperatingSystemPath(folderPathname)

    const folderBasenameArray = await createOperation({
      cancellationToken,
      start: () => readDirectory(folderPath),
    })

    await Promise.all(
      folderBasenameArray.map(async (basename) => {
        const folderEntryPathname = `${folderPathname}/${basename}`
        const folderEntryPath = pathnameToOperatingSystemPath(folderEntryPathname)
        const folderEntryRelativePath = pathnameToRelativePathname(
          folderEntryPathname,
          rootFolderPathname,
        )
        const lstat = await createOperation({
          cancellationToken,
          start: () => readLStat(folderEntryPath),
        })

        if (lstat.isDirectory()) {
          if (
            !pathnameCanContainsMetaMatching({
              pathname: folderEntryRelativePath,
              metaDescription,
              predicate,
            })
          )
            return null

          return visitFolder(folderEntryPathname)
        }

        if (lstat.isFile()) {
          const meta = pathnameToMeta({ pathname: folderEntryRelativePath, metaDescription })
          if (!predicate(meta)) {
            return null
          }

          const result = await createOperation({
            cancellationToken,
            start: () =>
              transformFile({
                relativePath: folderEntryRelativePath,
                meta,
                lstat,
              }),
          })
          results.push(result)
          return null
        }

        // we ignore symlink because entryFolder is recursively traversed
        // so symlinked file will be discovered.
        // Moreover if they lead outside of entryFolder it can become a problem
        // like infinite recursion of whatever.
        // that we could handle using an object of pathname already seen but it will be useless
        // because entryFolder is recursively traversed

        return null
      }),
    )
  }
  await visitFolder(rootFolderPathname)

  return results
}

const readDirectory = (pathname) =>
  new Promise((resolve, reject) => {
    readdir(pathname, (error, names) => {
      if (error) {
        reject(error)
      } else {
        resolve(names)
      }
    })
  })

const readLStat = (pathname) =>
  new Promise((resolve, reject) => {
    lstat(pathname, (error, stat) => {
      if (error) {
        reject(error)
      } else {
        resolve(stat)
      }
    })
  })
