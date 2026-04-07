import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ReqFlow',
  description: '一个基于插件与中间件的请求管线框架',
  lang: 'zh-CN',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jieci0825/reqflow' },
    ],
  },
})
