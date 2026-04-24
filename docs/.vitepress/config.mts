import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'reqflow',
  description: '一个基于插件与中间件的请求管线框架。',
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'reqflow',
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '^/guide/' },
      { text: 'API', link: '/api/', activeMatch: '^/api/' },
      { text: '示例', link: '/examples/', activeMatch: '^/examples/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/core-concepts' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [{ text: '导出总览', link: '/api/' }],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [{ text: '基础示例', link: '/examples/' }],
        },
      ],
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jieci0825/reqflow' },
    ],
    outline: {
      level: [2, 3],
      label: '本页导航',
    },
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    darkModeSwitchLabel: '切换主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2026 coderjc',
    },
  },
})
