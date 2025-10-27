import type { Plugin, ResolvedConfig } from 'vite'
import type { PluginOptions } from './types'
import * as path from 'node:path'
import { copyFiles, copyPagesFiles, processRewrite, replacePaths, updateAppJson } from './services/copy'
import { createWatcher } from './services/watcher'
import { logger, setDebug } from './utils/logger'

/**
 * uniWxCopyPlugin 插件
 * 方便在 uni-app 相关中使用原生微信小程序页面，自动处理依赖文件以及页面路径问题
 */
export default function uniWxCopyPlugin(options: PluginOptions = {}): Plugin {
  const {
    debug = false,
    rootDir = '',
    pages = [],
    subPackages = [],
    copy = [],
    rewrite = [],
    replaceRules = [],
  } = options

  setDebug(debug)

  let configPath = ''
  let isDev = false

  const shared = copy.find(copyItem => copyItem.shared)
  const allPages = [
    ...pages,
    ...subPackages.flatMap(sp => sp.pages.map(page => `${sp.root}/${page}`)),
  ]

  logger.debug('Plugin options:', { rootDir, copy, shared, pages, subPackages, rewrite })

  return {
    name: 'vite-plugin-uni-wx-copy',

    enforce: 'post',

    configResolved(resolvedConfig: ResolvedConfig) {
      const define = resolvedConfig.define || {}
      if (define['process.env.UNI_PLATFORM'] !== '"mp-weixin"') {
        return
      }

      const publicBasePath = resolvedConfig.base
      isDev = resolvedConfig.mode === 'development'

      logger.debug('Config resolved:', { publicBasePath, isDev })
    },

    async writeBundle(options: { dir?: string }) {
      const outDir = options.dir

      if (!outDir) {
        return
      }

      configPath = path.resolve(outDir)

      logger.debug('Write bundle:', { configPath })

      // 复制共享文件
      if (copy.length) {
        await copyFiles(rootDir, configPath, copy)
      }

      // 复制页面文件
      await copyPagesFiles(rootDir, configPath, allPages)

      // 替换路径
      if (shared) {
        await replacePaths(configPath, shared, allPages, replaceRules)
      }

      // 更新 app.json
      await updateAppJson(configPath, pages, subPackages)

      // 处理重写
      await processRewrite(configPath, rewrite)

      // 开发模式下监听文件变更
      if (isDev) {
        createWatcher({
          rootDir,
          configPath,
          copy,
          shared,
          allPages,
          rewrite,
          replaceRules,
        })
      }
    },
  }
}
