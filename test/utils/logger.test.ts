import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger, setDebug } from '../../src/utils/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setDebug(false)
  })

  describe('debug', () => {
    it('should not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      logger.debug('test message')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log when debug is true', () => {
      setDebug(true)
      const consoleSpy = vi.spyOn(console, 'log')
      logger.debug('test message')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[vite-plugin-uni-wx-copy] test message',
      )
    })

    it('should log with additional arguments', () => {
      setDebug(true)
      const consoleSpy = vi.spyOn(console, 'log')
      logger.debug('test message', { foo: 'bar' })
      expect(consoleSpy).toHaveBeenCalledWith(
        '[vite-plugin-uni-wx-copy] test message',
        { foo: 'bar' },
      )
    })
  })

  describe('info', () => {
    it('should always log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      logger.info('info message')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[vite-plugin-uni-wx-copy] info message',
      )
    })
  })

  describe('error', () => {
    it('should log error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      logger.error('error message')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[vite-plugin-uni-wx-copy] Error: error message',
        undefined,
      )
    })

    it('should log error with Error object', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const error = new Error('test error')
      logger.error('error message', error)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[vite-plugin-uni-wx-copy] Error: error message',
        error,
      )
    })
  })
})
