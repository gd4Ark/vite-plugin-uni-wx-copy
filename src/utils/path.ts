import * as path from 'node:path'

/**
 * 标准化路径，确保跨平台路径一致性
 * 将所有路径分隔符统一为 posix 风格 (/)
 */
export function normalizePath(pathStr: string): string {
  return pathStr.split(path.sep).join('/')
}
