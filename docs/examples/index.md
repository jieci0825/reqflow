# 基础示例

这个分组适合沉淀“从初始化到业务接入”的完整案例。当前先放一个最小示例，后续可以逐步扩展。

## 一个带插件的请求实例

```ts
import { createRequest } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'
import { errorPlugin, retryPlugin } from '@coderjc/reqflow/plugins'

const http = createRequest({
  adapter: fetchAdapter(),
  baseURL: 'https://api.example.com',
  plugins: [
    retryPlugin({ retries: 2 }),
    errorPlugin({
      onError: (error) => {
        console.error(error.message)
      },
    }),
  ],
})
```

## 后续可以继续补充的案例

- Token 自动注入与刷新
- 重试、错误处理、缓存组合使用
- 请求去重与竞态取消
- SSE / NDJSON 流式处理
