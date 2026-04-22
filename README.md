# reqflow

[![npm version](https://img.shields.io/npm/v/@coderjc/reqflow.svg)](https://www.npmjs.com/package/@coderjc/reqflow)
[![license](https://img.shields.io/npm/l/@coderjc/reqflow.svg)](https://github.com/jieci0825/reqflow/blob/main/LICENSE)

基于**插件**与**洋葱模型中间件**的请求管线框架，零依赖、完整 TypeScript 类型、同时支持 ESM 与 CJS。

## 特性

- 洋葱模型中间件管线，请求/响应双向拦截
- 插件化架构，按需组合功能
- 内置 Fetch 适配器，可扩展自定义适配器
- 内置多种实用插件：Token 注入、错误处理、重试、缓存、去重、Loading 管理、竞态取消、双 Token 刷新
- SSE（Server-Sent Events）流式解析支持
- 完整的 TypeScript 类型推导
- 零运行时依赖
- Tree-shakeable（`sideEffects: false`）

## 安装

```bash
npm install @coderjc/reqflow
```

```bash
pnpm add @coderjc/reqflow
```

```bash
yarn add @coderjc/reqflow
```

## 导出路径

@coderjc/reqflow 按功能拆分为多个子路径，按需导入：

| 路径 | 说明 |
| --- | --- |
| `@coderjc/reqflow` | 核心：`createRequest`、`compose` 及所有类型定义 |
| `@coderjc/reqflow/adapters/fetch` | 基于 Fetch API 的传输层适配器 |
| `@coderjc/reqflow/plugins` | 全部内置插件 |
| `@coderjc/reqflow/sse` | SSE / NDJSON 流式解析工具 |

## 快速开始

```typescript
import { createRequest } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'
import { tokenPlugin, errorPlugin } from '@coderjc/reqflow/plugins'

const http = createRequest({
  adapter: fetchAdapter(),
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: { 'X-Custom': 'value' },
  plugins: [
    tokenPlugin({ getToken: () => localStorage.getItem('token') }),
    errorPlugin({ onError: (err) => console.error(err.message) }),
  ],
})

// GET
const { data } = await http.get<UserList>('/users', { params: { page: 1 } })

// POST
await http.post('/users', { name: '@coderjc/reqflow' })

// PUT
await http.put('/users/1', { name: 'updated' })

// PATCH
await http.patch('/users/1', { age: 18 })

// DELETE
await http.delete('/users/1')
```

---

## 核心概念

### createRequest

`createRequest` 是整个框架的入口，接收一个 `GlobalConfig` 全局配置对象，返回一个请求引擎实例。

```typescript
import { createRequest } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'

const http = createRequest({
  adapter: fetchAdapter(),  // 必选，传输层适配器
  baseURL: 'https://api.example.com',  // 可选，所有请求的基础地址
  headers: { 'X-App': '@coderjc/reqflow' },     // 可选，所有请求的默认请求头
  timeout: 5000,                        // 可选，默认超时时间（毫秒）
  responseType: 'json',                 // 可选，默认响应格式
  plugins: [],                          // 可选，插件列表
})
```

引擎实例提供以下便捷方法，均返回 `Promise<Response<T>>`：

| 方法 | 签名 |
| --- | --- |
| `http.get(url, config?)` | GET 请求 |
| `http.post(url, data?, config?)` | POST 请求 |
| `http.put(url, data?, config?)` | PUT 请求 |
| `http.patch(url, data?, config?)` | PATCH 请求 |
| `http.delete(url, config?)` | DELETE 请求 |
| `http.head(url, config?)` | HEAD 请求 |
| `http.options(url, config?)` | OPTIONS 请求 |
| `http.request(config)` | 通用请求，需手动传入 `url` 和 `method` |

### RequestConfig

每次请求的完整配置，贯穿整个中间件管线：

```typescript
await http.request({
  url: '/users',
  method: 'GET',
  baseURL: 'https://other-api.com',  // 覆盖全局 baseURL
  headers: { 'X-Request-Id': '123' },
  params: { page: 1, size: 10 },     // URL 查询参数
  data: { name: '@coderjc/reqflow' },         // 请求体（POST/PUT/PATCH）
  timeout: 3000,
  signal: abortController.signal,     // 手动取消
  responseType: 'json',
  meta: { silent: true },            // 插件通信通道（见下文）
  middleware: [customMiddleware],      // 请求级中间件（见下文）
})
```

### Response

所有适配器返回的标准化响应结构：

```typescript
const res = await http.get<User[]>('/users')

res.data        // User[] — 响应数据，泛型 T
res.status      // number — HTTP 状态码
res.statusText  // string — HTTP 状态文本
res.headers     // Record<string, string> — 响应头
res.config      // RequestConfig — 产生此响应的原始请求配置
```

### meta — 插件通信通道

`meta` 是 `RequestConfig` 上的一个任意键值对象，用于**调用方与插件之间的通信**。多个内置插件通过 `meta` 读取开关标记，你也可以利用它传递自定义数据。

```typescript
// 跳过 loading 状态展示
await http.get('/background-task', { meta: { silent: true } })

// 跳过缓存
await http.get('/realtime-data', { meta: { cache: false } })

// 跳过去重
await http.post('/submit', data, { meta: { dedup: false } })

// 设定竞态 key
await http.get('/search', {
  params: { q: keyword },
  meta: { raceKey: 'search' },
})
```

---

## 洋葱模型中间件

reqflow 的中间件采用经典的**洋葱模型**：请求从外层中间件依次流入内层，到达适配器后响应从内层依次回到外层。每个中间件可以在 `next()` 调用前后分别处理请求和响应。

```
请求 → [中间件A 前] → [中间件B 前] → [适配器] → [中间件B 后] → [中间件A 后] → 响应
```

### 中间件签名

```typescript
import type { Middleware } from '@coderjc/reqflow'

const logger: Middleware = async (config, next) => {
  console.log('请求发出', config.method, config.url)
  const response = await next(config)
  console.log('响应返回', response.status)
  return response
}
```

### 全局中间件 vs 请求级中间件

全局中间件通过插件注册，对所有请求生效。请求级中间件通过 `config.middleware` 传入，仅对当前请求生效。

执行顺序为：**全局中间件（外层）→ 请求级中间件（内层）→ 适配器**。

```typescript
// 全局中间件：通过插件注册
const http = createRequest({
  adapter: fetchAdapter(),
  plugins: [
    {
      name: 'my-plugin',
      setup(ctx) {
        ctx.useMiddleware(async (config, next) => {
          // 对所有请求生效
          return next(config)
        })
      },
    },
  ],
})

// 请求级中间件：仅对当前请求生效
await http.get('/data', {
  middleware: [
    async (config, next) => {
      console.log('仅本次请求触发')
      return next(config)
    },
  ],
})
```

### compose

`compose` 函数将中间件数组与适配器组合为一条完整的执行链。通常无需直接使用，引擎内部已自动调用。如果你需要脱离引擎单独使用中间件管线，可以直接调用：

```typescript
import { compose } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'

const dispatch = compose([logger, auth], fetchAdapter())
const response = await dispatch({ url: 'https://api.example.com/data', method: 'GET' })
```

---

## 适配器

适配器是传输层抽象，负责将 `RequestConfig` 转为实际的网络请求并返回标准化 `Response`。

### 内置适配器：fetchAdapter

基于浏览器 / Node.js 原生 Fetch API 实现，开箱即用：

```typescript
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'

const http = createRequest({
  adapter: fetchAdapter(),
})
```

`fetchAdapter` 内置处理了以下能力：

- `params` 自动序列化拼接到 URL
- `timeout` 转为 `AbortController` 超时
- `signal` 支持外部手动取消，与超时信号自动合并
- `data` 根据类型自动序列化（对象 → JSON，FormData/Blob/ArrayBuffer 原样传递）
- `responseType` 支持 `json`（默认）、`text`、`blob`、`arraybuffer`

### 自定义适配器

只需实现 `Adapter` 接口即可接入任何 HTTP 客户端：

```typescript
import type { Adapter, RequestConfig, Response } from '@coderjc/reqflow'

function axiosAdapter(instance: AxiosInstance): Adapter {
  return {
    async request(config: RequestConfig): Promise<Response> {
      const res = await instance.request({
        url: config.url,
        method: config.method,
        headers: config.headers,
        params: config.params,
        data: config.data,
        timeout: config.timeout,
        signal: config.signal,
      })
      return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
        headers: res.headers as Record<string, string>,
        config,
      }
    },
  }
}
```

---

## 插件系统

插件是中间件的高级抽象。每个插件拥有一个 `name` 和一个 `setup` 方法，在引擎初始化时被调用。`setup` 接收 `PluginContext`，可以注册中间件、读取全局配置、通过 `shared` 在插件间共享状态。

```typescript
import type { Plugin } from '@coderjc/reqflow'

function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    setup(ctx) {
      // 读取全局配置
      const { baseURL } = ctx.getConfig()

      // 插件间共享状态
      ctx.shared.set('my-key', 'some-value')
      const val = ctx.shared.get('other-plugin-key')

      // 注册中间件
      ctx.useMiddleware(async (config, next) => {
        // 请求前 —— 修改 config
        config = { ...config, headers: { ...config.headers, 'X-Plugin': 'true' } }

        const response = await next(config)

        // 响应后 —— 修改或检查 response
        return response
      })
    },
  }
}
```

插件在 `plugins` 数组中的顺序决定了中间件的执行顺序——**排在前面的插件对应更外层的中间件**。

```typescript
const http = createRequest({
  adapter: fetchAdapter(),
  plugins: [
    errorPlugin({ ... }),   // 最外层，最先接触请求、最后接触响应
    retryPlugin({ ... }),   // 第二层
    tokenPlugin({ ... }),   // 最内层，最接近适配器
  ],
})
```

---

## 内置插件

### tokenPlugin — Token 注入

自动向每个请求的请求头注入身份认证 Token。

```typescript
import { tokenPlugin } from '@coderjc/reqflow/plugins'

tokenPlugin({
  // 必选：获取当前 token，返回 null/undefined 时不注入
  getToken: () => localStorage.getItem('access_token'),

  // 可选：请求头字段名，默认 'Authorization'
  headerKey: 'Authorization',

  // 可选：token 前缀，默认 'Bearer'；设为空字符串可取消前缀
  prefix: 'Bearer',
})
```

最终请求头效果：`Authorization: Bearer <your-token>`

如果 `getToken()` 返回 `null` 或 `undefined`，该请求不会注入任何 token 头。

---

### dualTokenPlugin — 双 Token 自动续期

适用于 Access Token + Refresh Token 的认证方案。当请求返回 401 时，自动用 Refresh Token 刷新 Access Token，然后重试原请求。并发的多个 401 请求会**共享同一次刷新**，避免重复刷新。

```typescript
import { dualTokenPlugin } from '@coderjc/reqflow/plugins'

dualTokenPlugin({
  // 必选：获取当前 access token
  getAccessToken: () => localStorage.getItem('access_token'),

  // 必选：获取当前 refresh token
  getRefreshToken: () => localStorage.getItem('refresh_token'),

  // 必选：刷新 token 的接口地址（相对路径会自动与 baseURL 拼接）
  refreshURL: '/auth/refresh',

  // 必选：刷新成功后的回调，用于持久化新 token
  onRefreshSuccess: (tokens) => {
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
  },

  // 必选：刷新失败时的回调（如清除登录态、跳转登录页）
  onRefreshFail: () => {
    localStorage.clear()
    window.location.href = '/login'
  },

  // 可选：自定义判断是否为未授权响应，默认检查 status === 401
  isUnauthorized: (response) => response.status === 401,

  // 可选：请求头字段名，默认 'Authorization'
  headerKey: 'Authorization',

  // 可选：token 前缀，默认 'Bearer'
  prefix: 'Bearer',
})
```

工作流程：

1. 请求发出前，自动注入 Access Token
2. 如果响应为 401，启动刷新流程（POST 到 `refreshURL`，body 为 `{ refreshToken }`）
3. 如果此时有其他请求也 401 了，它们会等待同一次刷新完成，不会重复调用刷新接口
4. 刷新成功 → 调用 `onRefreshSuccess` 保存新 token → 用新 token 重试原请求
5. 刷新失败 → 调用 `onRefreshFail` → 抛出错误

> 注意：如果使用 `dualTokenPlugin`，就不需要同时使用 `tokenPlugin`，因为 `dualTokenPlugin` 内部已经处理了 Token 注入。

---

### errorPlugin — 统一错误处理

统一捕获 HTTP 错误（状态码 ≥ 400）、传输层异常和本地运行时异常，通过 `onError` 回调通知调用方。

```typescript
import { errorPlugin } from '@coderjc/reqflow/plugins'

errorPlugin({
  // 必选：错误回调
  onError: (error) => {
    if (error.type === 'http') {
      // HTTP 错误：状态码异常
      console.error(`HTTP ${error.status}: ${error.message}`)
      console.log(error.response)  // 完整响应对象
    }

    if (error.type === 'network') {
      // 网络错误：请求根本没有到达服务器（断网、DNS 失败、CORS 等）
      console.error('网络异常:', error.message)
      console.log(error.cause)  // 原始 Error 对象
    }

    if (error.type === 'runtime') {
      // 运行时错误：本地中间件、插件或请求序列化逻辑抛出的异常
      console.error('运行时异常:', error.message)
      console.log(error.cause)  // 原始 Error 对象
    }

    // error.config 始终存在，包含原始请求配置
    console.log('请求配置:', error.config)
  },

  // 可选：跳过某些状态码，不触发 onError
  skipCodes: [401, 403],
})
```

`RequestError` 的类型定义：

```typescript
interface RequestError {
  type: 'http' | 'network' | 'runtime'
  message: string
  status?: number          // 仅 http 类型
  response?: Response      // 仅 http 类型
  config: RequestConfig
  cause?: Error            // 仅 network/runtime 类型
}
```

> errorPlugin **不会吞掉错误**：对于 network/runtime 异常会在 `onError` 回调后继续向外抛出；对于 HTTP 错误会正常返回响应。它只是提供了一个集中处理错误的切面。

---

### retryPlugin — 自动重试

请求失败时按策略自动重试，支持自定义重试条件和退避间隔。

```typescript
import { retryPlugin } from '@coderjc/reqflow/plugins'

retryPlugin({
  // 必选：最大重试次数
  maxRetries: 3,

  // 可选：重试间隔（毫秒），默认 0
  // 传入数字：固定间隔
  delay: 1000,
  // 传入函数：自定义退避策略（attempt 从 1 开始）
  delay: (attempt) => Math.min(1000 * 2 ** (attempt - 1), 30000),  // 指数退避

  // 可选：判断是否需要重试，默认对所有错误重试
  retryOn: (error) => {
    // 仅在网络错误或 5xx 时重试，运行时错误不重试
    if (error.type === 'network') return true
    if (error.type === 'runtime') return false
    if (error.status && error.status >= 500) return true
    return false
  },
})
```

重试机制细节：

- 同时拦截**network/runtime 异常**（`catch` 捕获）和 **HTTP 错误**（状态码 ≥ 400）
- 重试时 `config.meta.retryCount` 会被自动设置为当前重试次数，下游中间件/插件可读取
- 如果达到最大重试次数仍失败，network/runtime 异常会继续抛出，HTTP 错误会正常返回响应

> 建议将 `retryPlugin` 放在 `errorPlugin` **内层**（数组中更靠后），这样只有在重试全部耗尽后 `errorPlugin` 才会被触发。

---

### cachePlugin — 响应缓存

对请求结果进行内存缓存，在 TTL 有效期内直接返回缓存数据，避免重复请求。

```typescript
import { cachePlugin } from '@coderjc/reqflow/plugins'

cachePlugin({
  // 必选：缓存有效期（毫秒）
  ttl: 60 * 1000,  // 1 分钟

  // 可选：需要缓存的 HTTP 方法列表，默认 ['GET']
  methods: ['GET'],

  // 可选：自定义缓存 key 生成函数
  // 默认为 method:url:JSON.stringify(params)
  generateKey: (config) => `${config.method}:${config.url}`,

  // 可选：排除函数，返回 true 时该请求不走缓存
  exclude: (config) => config.url.includes('/realtime'),
})
```

运行时控制：通过 `meta.cache` 可以在单次请求级别跳过缓存：

```typescript
// 跳过缓存，强制发起真实请求
await http.get('/data', { meta: { cache: false } })
```

缓存命中时返回的是深拷贝（`structuredClone`），修改返回数据不会影响缓存。

---

### dedupPlugin — 请求去重

对并发的相同请求进行去重，多个相同请求共享同一个 Promise，只实际发出一次网络请求。

```typescript
import { dedupPlugin } from '@coderjc/reqflow/plugins'

dedupPlugin({
  // 可选：自定义去重 key 生成函数
  // 默认为 method:url:JSON.stringify(params)
  generateKey: (config) => `${config.method}:${config.url}`,
})
```

典型场景：多个组件同时挂载时都请求 `/user/profile`，实际只会发出一次请求，所有调用者收到同一个结果。

运行时控制：通过 `meta.dedup` 跳过去重：

```typescript
// 跳过去重，强制发起独立请求
await http.get('/data', { meta: { dedup: false } })
```

---

### loadingPlugin — 全局 Loading 管理

管理全局 Loading 状态，内部维护并发计数器——有请求进行中时显示 loading，全部完成后隐藏。支持延迟显示以避免快速请求造成的闪烁。

```typescript
import { loadingPlugin } from '@coderjc/reqflow/plugins'

loadingPlugin({
  // 必选：显示 loading 的回调
  onShow: () => {
    document.getElementById('loading')!.style.display = 'block'
  },

  // 必选：隐藏 loading 的回调
  onHide: () => {
    document.getElementById('loading')!.style.display = 'none'
  },

  // 可选：延迟显示阈值（毫秒），默认 0（立即显示）
  // 如果请求在延迟时间内完成，loading 不会被显示，避免闪烁
  delay: 200,
})
```

运行时控制：通过 `meta.silent` 让某个请求不触发 loading：

```typescript
// 静默请求，不影响 loading 状态
await http.get('/background-task', { meta: { silent: true } })
```

工作流程：

1. 请求开始 → 计数器 +1 → 如果从 0 变为 1，触发 `onShow`（或启动延迟定时器）
2. 请求结束 → 计数器 -1 → 如果从 1 变为 0，触发 `onHide`（或取消尚未触发的延迟定时器）
3. 设置了 `delay` 时，如果请求在 delay 时间内就完成了，`onShow` 永远不会被调用

---

### racePlugin — 竞态取消

同一 `raceKey` 的新请求会自动 abort 前一个未完成的请求，仅保留最新一次。适用于搜索联想、Tab 切换等场景。

```typescript
import { racePlugin } from '@coderjc/reqflow/plugins'

racePlugin({
  // 可选：自定义竞态 key 生成函数
  // 默认从 config.meta.raceKey 读取
  generateKey: (config) => config.meta?.raceKey,
})
```

使用时通过 `meta.raceKey` 标记哪些请求属于同一竞态组：

```typescript
// 搜索联想：用户连续输入，只保留最后一次
async function onInput(keyword: string) {
  const { data } = await http.get('/search', {
    params: { q: keyword },
    meta: { raceKey: 'search-suggest' },
  })
  renderSuggestions(data)
}
```

当同一 `raceKey` 的新请求发出时，前一个请求会被自动 abort。如果请求本身已经有 `signal`（外部传入的 AbortSignal），两个信号会被合并——任一触发都会取消请求。

没有 `raceKey`（或 `generateKey` 返回 `undefined`）的请求不受竞态管控。

---

## 插件推荐顺序

插件的排列顺序决定了中间件的嵌套层级。以下是一个推荐的组合方式：

```typescript
const http = createRequest({
  adapter: fetchAdapter(),
  baseURL: 'https://api.example.com',
  plugins: [
    // 最外层：错误处理，捕获所有下游抛出的异常
    errorPlugin({ onError: handleError }),

    // 第二层：Loading 管理
    loadingPlugin({ onShow, onHide, delay: 200 }),

    // 第三层：重试，重试过程中的请求对外层来说是透明的
    retryPlugin({ maxRetries: 2, delay: 1000 }),

    // 第四层：缓存，命中缓存后不会触发下游的去重和网络请求
    cachePlugin({ ttl: 60000 }),

    // 第五层：去重
    dedupPlugin(),

    // 第六层：竞态取消
    racePlugin(),

    // 最内层：Token 注入，最接近适配器
    tokenPlugin({ getToken: () => localStorage.getItem('token') }),
  ],
})
```

---

## SSE 流式解析

reqflow 提供两个流式解析函数，直接消费 `ReadableStream<Uint8Array>`（通常来自 `fetch` 的 `response.body`），无需依赖 `EventSource`，支持 POST 和自定义请求头。

### parseEventStream — 标准 SSE 协议解析

按照 [SSE 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html) 解析 `text/event-stream` 格式的流。

```typescript
import { parseEventStream } from '@coderjc/reqflow/sse'

const response = await fetch('https://api.example.com/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
  },
  body: JSON.stringify({ prompt: 'Hello' }),
})

await parseEventStream(response.body!, {
  onEvent: (event) => {
    console.log(event.event)  // 事件类型，默认 'message'
    console.log(event.data)   // 事件数据（字符串）
    console.log(event.id)     // 事件 ID（可选）
    console.log(event.retry)  // 重连间隔（可选）
  },
  onError: (error) => {
    console.error('解析错误:', error)
  },
})
```

SSE 流的标准格式：

```
event: message
data: {"content": "Hello"}
id: 1

data: {"content": " World"}
id: 2

```

### parseJSONStream — NDJSON 流解析

按 [NDJSON](https://github.com/ndjson/ndjson-spec)（Newline Delimited JSON）格式解析流，每行一个 JSON 对象。

```typescript
import { parseJSONStream } from '@coderjc/reqflow/sse'

interface ChatChunk {
  content: string
  done: boolean
}

const response = await fetch('https://api.example.com/chat')

await parseJSONStream<ChatChunk>(response.body!, {
  onJSON: (chunk) => {
    // chunk 已经是 JSON.parse 后的对象
    console.log(chunk.content)
    if (chunk.done) console.log('流结束')
  },
  onError: (error) => {
    console.error('JSON 解析失败:', error)
  },
})
```

NDJSON 流格式：

```
{"content":"Hello","done":false}
{"content":" World","done":false}
{"content":"","done":true}
```

### 结合 reqflow 引擎使用 SSE

你也可以用 reqflow 引擎发起请求，然后对响应体进行流式解析。通过 `responseType: 'text'` 获取原始 Response 并手动处理：

```typescript
const response = await fetch('https://api.example.com/stream', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ prompt: 'Hello' }),
})

await parseEventStream(response.body!, {
  onEvent: (event) => {
    const data = JSON.parse(event.data)
    appendMessage(data.content)
  },
  onError: console.error,
})
```

---

## TypeScript 类型

所有类型均从主入口 `reqflow` 导出：

```typescript
import type {
  // 核心类型
  Adapter,
  GlobalConfig,
  Method,
  Middleware,
  Next,
  Plugin,
  PluginContext,
  RequestConfig,
  Response,
} from '@coderjc/reqflow'

// 插件配置类型
import type {
  CachePluginOptions,
  DedupPluginOptions,
  DualTokenPluginOptions,
  ErrorPluginOptions,
  LoadingPluginOptions,
  RacePluginOptions,
  RetryPluginOptions,
  TokenPluginOptions,
  RequestError,
} from '@coderjc/reqflow/plugins'

// SSE 类型
import type {
  SSEEvent,
  SSEOptions,
  SSEConnection,
  SSEParserCallbacks,
  JSONStreamParserCallbacks,
} from '@coderjc/reqflow/sse'
```

---

## License

[MIT](./LICENSE)
