# vite-plugin-uni-wx-copy

一个帮助你在 uni-app 项目中复用原生微信小程序页面的混合开发插件。

## 为什么需要这个插件？

满足以下场景：

- 需要在 uni-app 项目中集成部分原生微信小程序页面
- 正在将原生微信小程序项目迁移到 uni-app，需要渐进式重构

## 特性

- 完美支持原生微信小程序和 uni-app 混合开发模式
- 自动将原生微信小程序页面和组件复制到 uni-app 构建产物中
- 支持主包和分包页面
- 自定义文件内容重写
- 自动路径解析和替换
- 开发模式下支持热重载

## 安装

```bash
pnpm add vite-plugin-uni-wx-copy -D
```

## 使用

### 项目结构

推荐的项目结构如下：

```text
.
├── src/                 # uni-app 项目主目录
│   ├── pages/          # uni-app 页面
│   ├── components/     # uni-app 组件
│   └── ...
├── miniprogram/        # 原生微信小程序代码目录（可选）
│   ├── components/     # 需要复用的原生组件
│   ├── pages/         # 需要复用的原生页面
│   └── ...
├── vite.config.ts      # Vite 配置文件
└── ...
```

### 配置步骤

1. 在 uni-app 项目的 `vite.config.ts` 中添加插件：

```ts
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
import uniWxCopy from 'vite-plugin-uni-wx-copy'

export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      rootDir: '../miniprogram',
      // 复制共享资源
      copy: [
        {
          sources: [
            'components',
            'static',
            'utils',
          ],
          dest: 'shared/',
          shared: true,
        },
      ],
      // 主包页面
      pages: [
        'pages/index',
        'pages/page1',
        'pages/page2',
      ],
      // 分包配置
      subPackages: [
        {
          root: 'subpackages',
          pages: ['detail'],
        },
      ],
    })
  ]
})
```

## 配置

### 插件选项

| 选项 | 类型 | 默认值 | 说明 |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | 启用调试模式，显示详细日志 |
| `rootDir` | `string` | `''` | 原生微信小程序代码的根目录 |
| `pages` | `string[]` | `[]` | 需要复制的主包页面路径列表 |
| `subPackages` | `Array<{ root: string, pages: string[] }>` | `[]` | 需要复制的分包页面列表 |
| `copy` | `Array<CopyItem>` | `[]` | 需要复制的文件和目录 |
| `rewrite` | `Array<WriteItem>` | `[]` | 文件内容重写配置 |
| `replaceRules` | `Array<ReplaceRule>` | `[]` | 路径替换规则 |

### 类型定义

```ts
interface CopyItem {
  // 需要复制的源目录列表
  sources: string[]
  // 目标目录
  dest: string
  // 是否为共享资源
  shared?: boolean
}

interface WriteItem {
  // 目标文件路径
  file: string
  // 修改文件内容的函数
  write: (content: string) => string
}

interface ReplaceRule {
  // 要匹配的正则表达式或字符串
  from: RegExp | string
  // 替换的目标字符串或函数
  to: string | ((match: string, ...args: string[]) => string)
  // 要处理的文件（glob 模式）
  files: string[]
}
```

## 实际开发示例

### 1. 共享组件配置

在 `vite.config.ts` 中配置共享组件：

```ts
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
import uniWxCopy from 'vite-plugin-uni-wx-copy'

export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      rootDir: '../miniprogram',
      // 复制共享组件和资源
      copy: [
        {
          sources: [
            'components',
            'static',
            'utils',
          ],
          dest: 'shared/',
          shared: true,
        },
      ],
      // 重写 app.json 以添加全局组件
      rewrite: [
        {
          file: 'app.json',
          write: (code) => {
            const appJson = JSON.parse(code)
            appJson.usingComponents = {
              ...appJson.usingComponents,
              'app-btn': '/shared/components/app-btn/app-btn',
            }
            return JSON.stringify(appJson, null, 2)
          },
        },
      ],
    })
  ]
})
```

### 2. 分包配置

在 `vite.config.ts` 中配置分包：

```ts
export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      rootDir: '../miniprogram',
      // 主包页面
      pages: [
        'pages/index',
        'pages/page1',
        'pages/page2',
      ],
      // 分包配置
      subPackages: [
        {
          root: 'subpackages',
          pages: ['detail'],
        },
      ],
    })
  ]
})
```

你可以参考 playground 目录下的示例项目来进行配置和开发。
