export interface CopyItem {
  /** 需要复制的源目录列表 */
  sources: string[]
  /** 目标目录 */
  dest: string
  /** 是否为共享资源 */
  shared?: boolean
}

export interface WriteItem {
  /** 目标文件路径 */
  file: string
  /** 修改文件内容的函数 */
  write: (content: string) => string
}

export interface ReplaceRule {
  /** 要匹配的正则表达式或字符串 */
  from: RegExp | string
  /** 替换的目标字符串或函数 */
  to: string | ((match: string, ...args: string[]) => string)
  /** 要处理的文件 glob 模式 */
  files: string[]
}

export interface SubPackage {
  /** 分包根目录 */
  root: string
  /** 分包页面列表 */
  pages: string[]
}

export interface PluginOptions {
  /** 是否开启调试模式 */
  debug?: boolean
  /** 源代码根目录 */
  rootDir?: string
  /** 需要复制的主包页面路径列表 */
  pages?: string[]
  /** 需要复制的分包配置 */
  subPackages?: SubPackage[]
  /** 需要复制的文件配置 */
  copy?: CopyItem[]
  /** 需要重写的文件配置 */
  rewrite?: WriteItem[]
  /** 路径替换规则 */
  replaceRules?: ReplaceRule[]
}

export interface AppJson {
  pages: string[]
  subPackages: Array<{
    root: string
    pages: string[]
  }>
  usingComponents?: Record<string, string>
}
