# 快速开始

:::danger
个人风格较为强烈，如果你也喜欢这种风格，欢迎你来尝试一下
:::

## 安装

::: code-group

```bash [pnpm]
pnpm add @coderjc/reqflow
```

```bash [npm]
npm install @coderjc/reqflow
```

:::

## 创建第一个请求实例

```ts
import { createRequest } from '@coderjc/reqflow'
import { fetchAdapter } from '@coderjc/reqflow/adapters/fetch'
import { errorPlugin, tokenPlugin } from '@coderjc/reqflow/plugins'
import { ElMessage } from 'element-plus'

export const request = createRequest({
    adapter: fetchAdapter(), // 使用 fetch 适配器
    baseURL: 'https://api.example.com', // 设置基础 URL
    headers: {
        'Content-Type': 'application/json', // 设置默认请求头
    },
    timeout: 10000, // 设置请求超时时间
    plugins: [
        errorPlugin({
            onError: error => {
                console.error('请求发生错误:', error)

                let message = '发生未知错误'

                // 处理 HTTP 错误
                if (error.type === 'http') {
                    message =
                        error.response?.data.message || `HTTP 错误 ${status}`
                }

                // 选择你喜欢的方式展示错误信息，例如 Element Plus 的 ElMessage
                ElMessage.error(message)

                // 通过 throw 抛出错误，终止后续请求流程
                throw error
            },
        }),

        tokenPlugin({
            getToken: () => localStorage.getItem('token'),
        }),
    ],
})
```

## 发起请求

```ts
const { data } = await request.get<User[]>('/users', {
  params: { page: 1 },
})
```
