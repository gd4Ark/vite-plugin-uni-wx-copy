import type { AppJson, CopyItem, ReplaceRule, SubPackage, WriteItem } from '../types'
import * as path from 'node:path'
import * as fs from 'fs-extra'
import { replaceInFile as replace } from 'replace-in-file'
import { logger } from '../utils/logger'
import { normalizePath } from '../utils/path'

/**
 * 复制共享文件
 */
export async function copyFiles(
  rootDir: string,
  configPath: string,
  copyItems: CopyItem[],
): Promise<void> {
  await Promise.all(
    copyItems.map(async ({ sources, dest }) => {
      const destPath = normalizePath(path.resolve(configPath, dest))
      await fs.ensureDir(destPath)

      await Promise.all(
        sources.map(async (source) => {
          const srcPath = normalizePath(path.resolve(rootDir, source))
          const targetPath = normalizePath(path.resolve(destPath, path.basename(source)))

          try {
            await fs.copy(srcPath, targetPath)
            logger.debug(`Copied: ${srcPath} -> ${targetPath}`)
          }
          catch (error) {
            logger.error(`Copy failed: ${srcPath} -> ${targetPath}`, error as Error)
          }
        }),
      )
    }),
  )
}

/**
 * 复制页面文件
 */
export async function copyPagesFiles(
  rootDir: string,
  configPath: string,
  pages: string[],
): Promise<void> {
  await Promise.all(
    pages.map(async (page) => {
      const srcPath = normalizePath(path.resolve(rootDir, page))
      const destPath = normalizePath(path.resolve(configPath, page))

      try {
        await fs.copy(srcPath, destPath)
        logger.debug(`Copied page: ${srcPath} -> ${destPath}`)
      }
      catch (error) {
        logger.error(`Failed to copy page: ${page}`, error as Error)
      }
    }),
  )
}

/**
 * 替换路径
 */
export async function replacePaths(
  configPath: string,
  shared: CopyItem,
  pages: string[],
  rules: ReplaceRule[] = [],
): Promise<void> {
  const defaultRules: ReplaceRule[] = [
    // import 路径替换
    {
      from: /from\s+'(\.\.\/.*)'/g,
      to: (match, p1) => {
        const sharedDir = shared.sources.find(dir => p1.includes(`../${dir}/`))
        return sharedDir
          ? `from '${p1.replace(`/${sharedDir}/`, `/${shared.dest}${sharedDir}/`)}'`
          : match
      },
      files: pages.map(page => normalizePath(path.join(configPath, page, '**/*.js'))),
    },
    // 组件路径替换
    {
      from: /"usingComponents"\s*:\s*\{[^}]*\}/g,
      to: (match) => {
        return shared.sources.reduce((acc, dir) => {
          return acc.includes(shared.dest)
            ? acc
            : acc.replace(new RegExp(`"/${dir}/`, 'g'), `"/${shared.dest}${dir}/`)
        }, match)
      },
      files: [
        ...pages.map(page => normalizePath(path.join(configPath, page, '**/*.json'))),
        ...shared.sources.map(dir => normalizePath(path.join(configPath, shared.dest, dir, '**/*.json'))),
      ],
    },
  ]

  // 合并默认规则和用户配置的规则，用户规则优先级更高
  const allRules = [...defaultRules, ...rules]

  try {
    for (const { from, to, files } of allRules) {
      await replace({
        from,
        to,
        files,
        allowEmptyPaths: true,
      })
    }
  }
  catch (error) {
    logger.error(`Error occurred during replacement`, error as Error)
  }
}

/**
 * 更新 app.json 文件
 */
export async function updateAppJson(
  configPath: string,
  pages: string[],
  subPackages: SubPackage[],
): Promise<void> {
  await modifyFile(configPath, 'app.json', (content: string) => {
    const appJson = JSON.parse(content) as AppJson

    // 处理主包页面
    pages.forEach((page) => {
      const pagePath = `${page}/${path.basename(page)}`
      if (!appJson.pages.includes(pagePath)) {
        appJson.pages.push(pagePath)
      }
    })

    // 处理分包页面
    subPackages.forEach((subPackage) => {
      const { root, pages: subPages } = subPackage
      let existingSubPackage = appJson.subPackages.find(sp => sp.root === root)
      if (!existingSubPackage) {
        existingSubPackage = { root, pages: [] }
        appJson.subPackages.push(existingSubPackage)
      }

      subPages.forEach((page: string) => {
        const pagePath = `${page}/${path.basename(page)}`
        if (!existingSubPackage.pages.includes(pagePath)) {
          existingSubPackage.pages.push(pagePath)
        }
      })
    })

    appJson.pages = [...new Set(appJson.pages)]

    return JSON.stringify(appJson, null, 2)
  })
}

/**
 * 处理重写文件内容
 */
export async function processRewrite(
  configPath: string,
  rewrite: WriteItem[],
): Promise<void> {
  await Promise.all(
    rewrite.map(({ file, write }) => modifyFile(configPath, file, write)),
  )
}

/**
 * 修改文件内容
 */
export async function modifyFile(
  configPath: string,
  file: string,
  modifyContent: (content: string) => string,
): Promise<void> {
  const fullPathFile = normalizePath(path.resolve(configPath, file))

  try {
    const content = await fs.readFile(fullPathFile, 'utf8')
    const modifiedContent = modifyContent(content)
    await fs.writeFile(fullPathFile, modifiedContent, 'utf8')
    logger.debug(`Modified file: ${fullPathFile}`)
  }
  catch (error) {
    logger.error(`Error modifying file ${fullPathFile}`, error as Error)
  }
}
