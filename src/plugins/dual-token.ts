import type { Plugin, RequestConfig, Response } from '@/core/types'

/** dualTokenPlugin 配置项 */
export interface DualTokenPluginOptions {
    /** 获取当前 access token */
    getAccessToken: () => string | null
    /** 获取当前 refresh token */
    getRefreshToken: () => string | null
    /** 刷新 token 的接口地址 */
    refreshURL: string
    /** 刷新成功后的回调，用于持久化新 token */
    onRefreshSuccess: (tokens: { access: string; refresh: string }) => void
    /** 刷新失败时的回调（如跳登录页） */
    onRefreshFail: () => void
    /** 判断响应是否为未授权，默认检查 status === 401 */
    isUnauthorized?: (response: Response) => boolean
    /** token 注入请求头的字段名，默认 Authorization */
    headerKey?: string
    /** token 前缀，默认 Bearer */
    prefix?: string
}

/** 双 token 自动续期插件，401 时自动刷新 access token 并重试原请求，并发 401 共享同一次刷新 */
export function dualTokenPlugin(options: DualTokenPluginOptions): Plugin {
    const {
        getAccessToken,
        getRefreshToken,
        refreshURL,
        onRefreshSuccess,
        onRefreshFail,
        isUnauthorized = (response: Response) => response.status === 401,
        headerKey = 'Authorization',
        prefix = 'Bearer',
    } = options

    let refreshing: Promise<boolean> | null = null

    return {
        name: 'dual-token',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                const { baseURL } = ctx.getConfig()
                const fullRefreshURL = buildRefreshURL(baseURL, refreshURL)

                if (isRefreshRequest(config.url, fullRefreshURL)) {
                    return next(config)
                }

                config = injectToken(config, getAccessToken(), headerKey, prefix)
                const response = await next(config)

                if (!isUnauthorized(response)) {
                    return response
                }

                if (!refreshing) {
                    refreshing = doRefresh(fullRefreshURL, getRefreshToken(), onRefreshSuccess, onRefreshFail)
                        .finally(() => { refreshing = null })
                }

                const success = await refreshing

                if (!success) {
                    throw new Error('Token refresh failed')
                }

                const retryConfig = injectToken(config, getAccessToken(), headerKey, prefix)
                return next(retryConfig)
            })
        },
    }
}

function injectToken(
    config: RequestConfig,
    token: string | null,
    headerKey: string,
    prefix: string
): RequestConfig {
    if (token == null) {
        return config
    }

    const value = prefix ? `${prefix} ${token}` : token
    return {
        ...config,
        headers: {
            ...config.headers,
            [headerKey]: value,
        },
    }
}

function buildRefreshURL(baseURL: string | undefined, refreshURL: string): string {
    if (/^https?:\/\//i.test(refreshURL)) {
        return refreshURL
    }

    if (!baseURL) {
        return refreshURL
    }

    return baseURL.replace(/\/+$/, '') + '/' + refreshURL.replace(/^\/+/, '')
}

function isRefreshRequest(requestURL: string, fullRefreshURL: string): boolean {
    return requestURL === fullRefreshURL
}

async function doRefresh(
    url: string,
    refreshToken: string | null,
    onRefreshSuccess: DualTokenPluginOptions['onRefreshSuccess'],
    onRefreshFail: DualTokenPluginOptions['onRefreshFail']
): Promise<boolean> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        })

        if (!res.ok) {
            onRefreshFail()
            return false
        }

        const data = await res.json()
        onRefreshSuccess(data)
        return true
    } catch {
        onRefreshFail()
        return false
    }
}
