import type { FSWatcher } from 'chokidar'
import type { CopyItem, ReplaceRule, WriteItem } from '../types'
import * as path from 'node:path'
import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import { logger } from '../utils/logger'
import { modifyFile, replacePaths } from './copy'

export interface WatcherOptions {
  rootDir: string
  configPath: string
  copy: CopyItem[]
  shared?: CopyItem
  allPages: string[]
  rewrite: WriteItem[]
  replaceRules: ReplaceRule[]
}

/**
 * 创建文件监听器
 */
export function createWatcher(options: WatcherOptions): FSWatcher {
  const { rootDir, configPath, copy, shared, allPages, rewrite, replaceRules } = options

  return chokidar.watch(rootDir, {
    persistent: true,
    ignoreInitial: true,
  })
    .on('change', async (filePath: string) => {
      logger.debug(`File changed: ${filePath}`)
      await handleFileChange(filePath, {
        rootDir,
        configPath,
        copy,
        shared,
        allPages,
        rewrite,
        replaceRules,
      })
    })
    .on('error', (error) => {
      logger.error('Watcher error', error)
    })
}

/**
 * 处理文件变更
 */
async function handleFileChange(
  filePath: string,
  options: WatcherOptions,
): Promise<void> {
  const { rootDir, configPath, copy, shared, allPages, rewrite, replaceRules } = options

  let relativePath = path.relative(rootDir, filePath)
  let isCopyFile = false

  // 检查是否是复制文件
  for (const copyItem of copy) {
    if (copyItem.sources.includes(relativePath.split(path.sep)[0])) {
      relativePath = path.join(copyItem.dest, relativePath)
      isCopyFile = true
      break
    }
  }

  // 检查是否是页面文件
  if (!isCopyFile && !allPages.some(page => relativePath.startsWith(page))) {
    return
  }

  const fullPathDest = path.resolve(configPath, relativePath)

  // 拷贝文件
  try {
    logger.debug(`Copying: ${filePath} -> ${fullPathDest}`)
    await fs.copy(filePath, fullPathDest)
  }
  catch (error) {
    logger.error(`Error copying from ${filePath} to ${fullPathDest}`, error as Error)
    return
  }

  // 替换路径
  if (shared) {
    await replacePaths(configPath, shared, allPages, replaceRules)
  }

  // 重写文件
  const matchRewrite = rewrite.find(({ file }) => file === relativePath)
  if (matchRewrite) {
    await modifyFile(configPath, matchRewrite.file, matchRewrite.write)
  }
}
