# API 总览

当前包对外主要暴露 4 组入口，适合按能力拆分文档：

| 入口 | 说明 |
| --- | --- |
| `@coderjc/reqflow` | 核心引擎、类型定义、`createRequest` 等主能力 |
| `@coderjc/reqflow/adapters/fetch` | 基于 Fetch API 的适配器 |
| `@coderjc/reqflow/plugins` | 内置插件集合 |
| `@coderjc/reqflow/sse` | SSE / NDJSON 流式解析工具 |

## 推荐拆分方式

- 核心：配置项、请求方法、响应结构、类型
- 适配器：适配器约定、Fetch 适配器参数、扩展方式
- 插件：每个插件一页，说明参数、默认行为与注意事项
- SSE：事件流解析、JSON 流解析、浏览器与服务端场景

## 下一步建议

- 为 `createRequest` 补完整参数表
- 为每个插件补默认配置与示例
- 为 SSE 能力补输入输出说明与用例
