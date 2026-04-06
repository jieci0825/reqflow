import type { Plugin } from '@/core/types'

/** tokenPlugin 配置项 */
export interface TokenPluginOptions {
    /** 获取当前 token，返回 null/undefined 时不注入请求头 */
    getToken: () => string | null | undefined
    /** 请求头字段名，默认 Authorization */
    headerKey?: string
    /** token 前缀，默认 Bearer，设为空字符串可取消前缀 */
    prefix?: string
}

/** 自动向请求头注入身份认证 token */
export function tokenPlugin(options: TokenPluginOptions): Plugin {
    const {
        getToken,
        headerKey = 'Authorization',
        prefix = 'Bearer',
    } = options

    return {
        name: 'token',
        setup(ctx) {
            ctx.useMiddleware(async (config, next) => {
                const token = getToken()

                if (token != null) {
                    const value = prefix ? `${prefix} ${token}` : token
                    config = {
                        ...config,
                        headers: {
                            ...config.headers,
                            [headerKey]: value,
                        },
                    }
                }

                return next(config)
            })
        },
    }
}
