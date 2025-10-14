# vite-plugin-uni-wx-copy

一个帮助你在 uni-app 项目中使用原生微信小程序页面的 Vite 插件。它能自动处理依赖文件和页面路径问题，让你轻松地将原生微信小程序组件和页面集成到 uni-app 项目中。

## 特性

- 自动将原生微信小程序页面和组件复制到 uni-app 构建产物中
- 支持主包和分包页面
- 共享组件和工具管理
- 自定义文件内容重写
- 自动路径解析和替换
- 开发模式下支持热重载

## 安装

```bash
pnpm add vite-plugin-uni-wx-copy -D
```

## 使用

在你的 `vite.config.ts` 中添加插件：

```ts
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
import uniWxCopy from 'vite-plugin-uni-wx-copy'

export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      // options...
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

## 示例

下面是该插件的完整使用示例：

```ts
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
import uniWxCopy from 'vite-plugin-uni-wx-copy'

export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      debug: false,
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
    }),
  ],
})

// 你可以参考 playground 目录下的示例用法来进行配置和开发
