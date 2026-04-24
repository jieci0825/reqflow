---
layout: home

hero:
  name: reqflow
  text: 面向插件与中间件的请求管线框架
  tagline: 零依赖、完整 TypeScript 类型，同时支持 ESM 与 CJS，适合构建可扩展的请求层。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 总览
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/jieci0825/reqflow

features:
  - title: 洋葱模型中间件
    details: 请求与响应双向穿过同一条管线，便于统一处理鉴权、日志、错误与数据转换。
  - title: 插件化扩展
    details: 内置 Token、重试、缓存、去重、竞态取消、双 Token 刷新等常见能力。
  - title: 流式响应支持
    details: 提供 SSE / NDJSON 解析工具，可直接接入对话式、实时推送等场景。
  - title: 类型优先
    details: 核心引擎、插件与适配器都有完整 TypeScript 类型，便于在业务侧安全扩展。
---
