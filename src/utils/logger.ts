/* eslint-disable no-console */

let isDebug = false

export function setDebug(debug: boolean): void {
  isDebug = debug
}

function formatMessage(message: string): string {
  return `[vite-plugin-uni-wx-copy] ${message}`
}

export const logger = {
  debug(message: string, ...args: any[]): void {
    if (!isDebug)
      return
    console.log(formatMessage(message), ...args)
  },

  info(message: string, ...args: any[]): void {
    console.log(formatMessage(message), ...args)
  },

  error(message: string, error?: Error): void {
    console.error(formatMessage(`Error: ${message}`), error)
  },
}
