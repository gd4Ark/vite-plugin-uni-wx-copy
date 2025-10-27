import * as fs from 'fs-extra'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyFiles, copyPagesFiles, modifyFile, updateAppJson } from '../../src/services/copy'

// Mock fs-extra
vi.mock('fs-extra', () => ({
  copy: vi.fn(),
  ensureDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('copy service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('copyFiles', () => {
    it('should copy files correctly', async () => {
      const copyItems = [{
        sources: ['components', 'utils'],
        dest: 'shared',
      }]

      await copyFiles('/root', '/config', copyItems)

      expect(fs.ensureDir).toHaveBeenCalledWith('/config/shared')
      expect(fs.copy).toHaveBeenCalledWith(
        '/root/components',
        '/config/shared/components',
      )
      expect(fs.copy).toHaveBeenCalledWith(
        '/root/utils',
        '/config/shared/utils',
      )
    })

    it('should handle multiple copy items', async () => {
      const copyItems = [
        {
          sources: ['components'],
          dest: 'shared',
        },
        {
          sources: ['static'],
          dest: 'assets',
        },
      ]

      await copyFiles('/root', '/config', copyItems)

      expect(fs.ensureDir).toHaveBeenCalledTimes(2)
      expect(fs.copy).toHaveBeenCalledTimes(2)
    })
  })

  describe('copyPagesFiles', () => {
    it('should copy page files', async () => {
      const pages = ['pages/index', 'pages/home']

      await copyPagesFiles('/root', '/config', pages)

      expect(fs.copy).toHaveBeenCalledWith(
        '/root/pages/index',
        '/config/pages/index',
      )
      expect(fs.copy).toHaveBeenCalledWith(
        '/root/pages/home',
        '/config/pages/home',
      )
    })
  })

  describe('modifyFile', () => {
    it('should modify file content', async () => {
      const originalContent = 'original content'
      const modifiedContent = 'modified content'

      vi.mocked(fs.readFile).mockResolvedValue(originalContent)

      await modifyFile('/config', 'test.txt', () => modifiedContent)

      expect(fs.readFile).toHaveBeenCalledWith('/config/test.txt', 'utf8')
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/config/test.txt',
        modifiedContent,
        'utf8',
      )
    })
  })

  describe('updateAppJson', () => {
    it('should add pages to app.json', async () => {
      const appJson = {
        pages: [],
        subPackages: [],
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(appJson))

      await updateAppJson('/config', ['pages/index'], [])

      expect(fs.writeFile).toHaveBeenCalled()
      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string
      const parsed = JSON.parse(writtenContent)

      expect(parsed.pages).toContain('pages/index/index')
    })

    it('should add subpackages to app.json', async () => {
      const appJson = {
        pages: [],
        subPackages: [],
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(appJson))

      await updateAppJson('/config', [], [
        {
          root: 'packages',
          pages: ['detail'],
        },
      ])

      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string
      const parsed = JSON.parse(writtenContent)

      expect(parsed.subPackages).toHaveLength(1)
      expect(parsed.subPackages[0].root).toBe('packages')
      expect(parsed.subPackages[0].pages).toContain('detail/detail')
    })
  })
})
