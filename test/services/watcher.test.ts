import { describe, expect, it, vi } from 'vitest'
import { createWatcher } from '../../src/services/watcher'

// Mock chokidar
const mockOn = vi.fn().mockReturnThis()
const mockWatcher = {
  on: mockOn,
}

vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher),
}))

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fs-extra
vi.mock('fs-extra', () => ({
  copy: vi.fn(),
}))

// Mock copy service
vi.mock('../../src/services/copy', () => ({
  modifyFile: vi.fn(),
  replacePaths: vi.fn(),
}))

describe('watcher service', () => {
  it('should create watcher with correct options', async () => {
    const chokidar = await import('chokidar')
    const options = {
      rootDir: '/root',
      configPath: '/config',
      copy: [],
      shared: undefined,
      allPages: [],
      rewrite: [],
      replaceRules: [],
    }

    const watcher = createWatcher(options)

    expect(chokidar.watch).toHaveBeenCalledWith('/root', {
      persistent: true,
      ignoreInitial: true,
    })
    expect(watcher).toBeDefined()
  })

  it('should register event handlers', async () => {
    vi.clearAllMocks()

    const options = {
      rootDir: '/root',
      configPath: '/config',
      copy: [],
      shared: undefined,
      allPages: [],
      rewrite: [],
      replaceRules: [],
    }

    createWatcher(options)

    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))
  })
})
