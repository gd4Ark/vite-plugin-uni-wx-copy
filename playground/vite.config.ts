import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'
import uniWxCopy from 'vite-plugin-uni-wx-copy'

const uniPlugin = uni() as any
const uniWxCopyPlugin = uniWxCopy as any

export default defineConfig({
  plugins: [
    uniPlugin,
    uniWxCopyPlugin({
      debug: false,
      rootDir: '../miniprogram',
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
      pages: [
        'pages/index',
        'pages/page1',
        'pages/page2',
      ],
      subPackages: [
        {
          root: 'subpackages',
          pages: ['detail'],
        },
      ],
      rewrite: [
        {
          file: 'app.json',
          write: (code: string) => {
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
