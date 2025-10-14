/* eslint-disable no-console */
import type { Plugin, ResolvedConfig } from 'vite'
import * as path from 'node:path'
import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import { replaceInFile as replace } from 'replace-in-file'

let configPath = ''
let debug = false

function log(message: any, type: 'log' | 'error' = 'log'): void {
  if (!debug) {
    return
  }

  const prefix = '[vite-plugin-uni-wx-copy]'
  if (type === 'error') {
    console.error(`${prefix} Error:`, message)
  }
  else {
    console.log(`${prefix}`, message)
  }
}

interface CopyItem {
  sources: string[]
  dest: string
  shared?: boolean
}

interface WriteItem {
  file: string
  write: (content: string) => string
}

interface ReplaceRule {
  /** 要匹配的正则表达式 */
  from: RegExp | string
  /** 替换的目标字符串或函数 */
  to: string | ((match: string, ...args: string[]) => string)
  /** 要处理的文件 glob 模式 */
  files: string[]
}

interface AppJson {
  pages: string[]
  subPackages: Array<{
    root: string
    pages: string[]
  }>
}

interface PluginOptions {
  /** 是否开启调试模式 */
  debug?: boolean
  /** 源代码根目录 */
  rootDir?: string
  /** 需要复制的主包页面路径列表 */
  pages?: string[]
  /** 需要复制的分包配置 */
  subPackages?: Array<{
    root: string
    pages: string[]
  }>
  /** 需要复制的文件配置 */
  copy?: CopyItem[]
  /** 需要重写的文件配置 */
  rewrite?: WriteItem[]
  /** 路径替换规则 */
  replaceRules?: ReplaceRule[]
}

/**
 * uniWxCopyPlugin 插件
 * 方便在 uni-app 相关中使用原生微信小程序页面，自动处理依赖文件以及页面路径问题
 */
export default function uniWxCopyPlugin(options: PluginOptions = {}): Plugin {
  const { debug: optionsDebug = false, rootDir = '', pages = [], subPackages = [], copy = [], rewrite = [], replaceRules = [] } = options
  let publicBasePath = ''
  let isDev = false
  debug = optionsDebug

  const shared = copy.find(copyItem => copyItem.shared)
  const allPages = [...pages, ...subPackages.flatMap(sp => sp.pages.map(page => `${sp.root}/${page}`))]

  log({ rootDir, copy, shared, pages, subPackages, rewrite })

  return {
    name: 'vite-plugin-uni-wx-copy',

    enforce: 'post',

    configResolved(resolvedConfig: ResolvedConfig) {
      const define = resolvedConfig.define || {}
      if (define['process.env.UNI_PLATFORM'] !== '"mp-weixin"') {
        return
      }

      publicBasePath = resolvedConfig.base
      isDev = resolvedConfig.mode === 'development'
    },

    async writeBundle(options: { dir?: string }) {
      const p = options.dir

      if (!p || !publicBasePath) {
        return
      }

      configPath = getFullPath(publicBasePath, p)

      await copyWxFiles({ rootDir, copy, shared, pages, subPackages, rewrite, replaceRules })

      if (isDev) {
        const watcher = chokidar.watch(rootDir, {
          persistent: true,
        })

        /**
         * 监听原生小程序目录，针对当前修改文件，重走拷贝、替换路径、重写等流程
         */
        watcher.on('change', async (filePath: string) => {
          log(`change: ${filePath}`)
          let relativePath = path.relative(rootDir, filePath)
          let isCopyFile = false

          for (const copyItem of copy) {
            if (copyItem.sources.includes(relativePath.split(path.sep)[0])) {
              relativePath = path.join(copyItem.dest, relativePath)
              isCopyFile = true
            }
          }

          if (!isCopyFile && !allPages.some(page => relativePath.startsWith(page))) {
            relativePath = ''
          }

          if (!relativePath) {
            return
          }

          const fullPathDest = getFullPath(configPath, relativePath)

          // 拷贝
          try {
            log(`copy: ${filePath} to ${fullPathDest}`)
            await fs.copy(filePath, fullPathDest)
          }
          catch (error) {
            if (debug) {
              log(`Error copying from ${filePath} to ${fullPathDest}: ${error}`, 'error')
            }
          }

          // 替换路径
          if (shared) {
            await replacePaths(shared, pages, replaceRules)
          }

          // 重写
          const matchRewrite = rewrite.find(({ file }) => file === relativePath)

          if (matchRewrite) {
            await modifyFile(matchRewrite.file, matchRewrite.write)
          }
        })
      }
    },
  }
}

// 执行同步原生代码及相关操作
async function copyWxFiles({ rootDir, copy, shared, pages, subPackages, rewrite, replaceRules }: {
  rootDir: string
  copy: CopyItem[]
  shared: CopyItem | undefined
  pages: string[]
  subPackages: Array<{
    root: string
    pages: string[]
  }>
  rewrite: WriteItem[]
  replaceRules: ReplaceRule[]
}): Promise<void> {
  const allPages = [...pages, ...subPackages.flatMap(sp => sp.pages.map(page => `${sp.root}/${page}`))]

  if (copy.length) {
    await copyFiles(copy, rootDir)
  }

  await copyPagesFiles(allPages, rootDir)

  if (shared) {
    await replacePaths(shared, allPages, replaceRules)
  }

  await updateAppJson({ pages, subPackages })

  await processRewrite(rewrite)
}

/**
 * 获取完整路径
 */
function getFullPath(...args: string[]): string {
  return path.resolve(...args)
}

/**
 * 拷贝公共文件
 */
async function copyFiles(copy: CopyItem[], rootDir: string): Promise<void> {
  await Promise.all(
    copy.map(async ({ sources, dest }) => {
      await fs.ensureDir(getFullPath(configPath, dest))

      await Promise.all(
        sources.map(async (source) => {
          const fullPathSrc = getFullPath(rootDir, source)
          const fullPathDest = getFullPath(configPath, dest, path.basename(source))
          try {
            await fs.copy(fullPathSrc, fullPathDest)
          }
          catch (error) {
            if (debug)
              log(`Error copying from ${fullPathSrc} to ${fullPathDest}: ${error}`, 'error')
          }
        }),
      )
    }),
  )
}

/**
 * 拷贝页面文件
 */
async function copyPagesFiles(pages: string[], rootDir: string): Promise<void> {
  await Promise.all(
    pages.map(async (page) => {
      const fullPathSrc = getFullPath(rootDir, page)
      const fullPathDest = getFullPath(configPath, page)
      try {
        await fs.copy(fullPathSrc, fullPathDest)
      }
      catch (error) {
        if (debug) {
          log(`Error copying from ${fullPathSrc} to ${fullPathDest}: ${error}`, 'error')
        }
      }
    }),
  )
}

/**
 * 替换路径
 */
async function replacePaths(shared: CopyItem, pages: string[], rules: ReplaceRule[] = []): Promise<void> {
  // 默认规则作为示例，用户可以参考这些规则来配置自己的规则
  const defaultRules: ReplaceRule[] = [
    // import 路径替换示例
    {
      from: /from\s+'(\.\.\/.*)'/g,
      to: (match, p1) => {
        const sharedDir = shared.sources.find(dir => p1.includes(`../${dir}/`))
        return sharedDir
          ? `from '${p1.replace(`/${sharedDir}/`, `/${shared.dest}${sharedDir}/`)}'`
          : match
      },
      files: pages.map(page => path.join(configPath, page, '**/*.js')),
    },
    // 组件路径替换示例
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
        ...pages.map(page => path.join(configPath, page, '**/*.json')),
        ...shared.sources.map(dir => path.join(configPath, shared.dest, dir, '**/*.json')),
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
    if (debug) {
      log(`Error occurred during replacement: ${error}`, 'error')
    }
  }
}

/**
 * 更新 app.json 文件
 */
async function updateAppJson({ pages, subPackages }: {
  pages: string[]
  subPackages: Array<{
    root: string
    pages: string[]
  }>
}): Promise<void> {
  await modifyFile('app.json', (content: string) => {
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
async function processRewrite(rewrite: WriteItem[]): Promise<void> {
  await Promise.all(rewrite.map(({ file, write }) => modifyFile(file, write)))
}

/**
 * 修改文件内容
 */
async function modifyFile(file: string, modifyContent: (content: string) => string): Promise<void> {
  const fullPathFile = getFullPath(configPath, file)

  try {
    const content = await fs.readFile(fullPathFile, 'utf8')
    const modifiedContent = modifyContent(content)
    await fs.writeFile(fullPathFile, modifiedContent, 'utf8')
  }
  catch (error) {
    if (debug) {
      log(`Error modifying file ${fullPathFile}: ${error}`, 'error')
    }
  }
}
