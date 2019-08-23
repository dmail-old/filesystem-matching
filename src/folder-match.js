import { readdir, lstat } from "fs"
import { createCancellationToken, createOperation } from "@dmail/cancellation"
import {
  operatingSystemPathToPathname,
  pathnameToOperatingSystemPath,
  pathnameToRelativePathname,
} from "@jsenv/operating-system-path"
import { resolveMetaMapPatterns, urlCanContainsMetaMatching, urlToMeta } from "@jsenv/url-meta"

export const matchAllFileInsideFolder = async ({
  cancellationToken = createCancellationToken(),
  folderPath,
  metaDescription,
  predicate,
  matchingFileOperation = () => null,
}) => {
  if (typeof folderPath !== "string")
    throw new TypeError(`folderPath must be a string, got ${folderPath}`)
  if (typeof metaDescription !== "object")
    throw new TypeError(`metaDescription must be a object, got ${metaDescription}`)
  if (typeof predicate !== "function")
    throw new TypeError(`predicate must be a function, got ${predicate}`)
  if (typeof matchingFileOperation !== "function")
    throw new TypeError(`matchingFileOperation must be a function, got ${matchingFileOperation}`)

  const matchingFileResultArray = []
  const rootFolderPathname = operatingSystemPathToPathname(folderPath)
  const metaMap = resolveMetaMapPatterns(metaDescription, `file://${rootFolderPathname}`)
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
            !urlCanContainsMetaMatching({
              url: `file://${rootFolderPathname}${folderEntryRelativePath}`,
              metaMap,
              predicate,
            })
          ) {
            return
          }

          await visitFolder(folderEntryPathname)
          return
        }

        if (lstat.isFile()) {
          const meta = urlToMeta({
            url: `file://${rootFolderPathname}${folderEntryRelativePath}`,
            metaMap,
          })
          if (!predicate(meta)) return

          const relativePath = folderEntryRelativePath
          const operationResult = await createOperation({
            cancellationToken,
            start: () =>
              matchingFileOperation({
                cancellationToken,
                relativePath,
                meta,
                lstat,
              }),
          })
          matchingFileResultArray.push({ relativePath, meta, lstat, operationResult })
          return
        }

        // we ignore symlink because entryFolder is recursively traversed
        // so symlinked file will be discovered.
        // Moreover if they lead outside of entryFolder it can become a problem
        // like infinite recursion of whatever.
        // that we could handle using an object of pathname already seen but it will be useless
        // because entryFolder is recursively traversed
      }),
    )
  }
  await visitFolder(rootFolderPathname)

  return matchingFileResultArray
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
