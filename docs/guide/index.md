# 快速开始

## 安装

::: code-group

```bash [npm]
npm install reqflow
```

```bash [pnpm]
pnpm add reqflow
```

:::

## 创建请求实例

通过 `createRequest` 创建实例，传入适配器和插件：

```ts
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { tokenPlugin, errorPlugin } from 'reqflow/plugins'

const request = createRequest({
  baseURL: 'https://api.example.com',
  adapter: fetchAdapter(),
  plugins: [
    tokenPlugin({
      getToken: () => localStorage.getItem('token'),
    }),
    errorPlugin({
      onError: (error) => console.error(`[${error.type}] ${error.message}`),
    }),
  ],
})
```

## 发送请求

```ts
// GET
const users = await request.get('/users', {
  params: { page: 1 },
})
console.log(users.data)

// POST
const newUser = await request.post('/users', {
  data: { name: 'test' },
})
console.log(newUser.data)
```

## SSE 流式请求

ReqFlow 提供了 `parseEventStream` 和 `parseJSONStream` 两个解析器，用于处理 SSE 流：

```ts
import { parseEventStream } from 'reqflow/sse'

const response = await fetch('https://api.example.com/sse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'hello' }),
})

await parseEventStream(response.body!, {
  onEvent: (event) => {
    console.log(event.event, event.data)
  },
  onError: (error) => {
    console.error(error)
  },
})
```

如果服务端返回的是 NDJSON 格式，可以使用 `parseJSONStream`：

```ts
import { parseJSONStream } from 'reqflow/sse'

await parseJSONStream(response.body!, {
  onJSON: (data) => {
    console.log(data)
  },
  onError: (error) => {
    console.error(error)
  },
})
```
