import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { errorPlugin, loadingPlugin, tokenPlugin } from 'reqflow/plugins'
import { ref } from 'vue'

import { useErrorLog } from './use-error-log'

const loadingCount = ref(0)
const loadingTimer = ref<ReturnType<typeof setTimeout>>()

export const isLoading = ref(false)

const LOADING_DELAY = 200

function showLoading() {
    loadingCount.value++
    if (loadingCount.value === 1) {
        loadingTimer.value = setTimeout(() => {
            isLoading.value = true
        }, LOADING_DELAY)
    }
}

function hideLoading() {
    loadingCount.value = Math.max(0, loadingCount.value - 1)
    if (loadingCount.value === 0) {
        clearTimeout(loadingTimer.value)
        isLoading.value = false
    }
}

const currentToken = ref('my-jwt-token-abc123')

/** 带 loading / error / token 插件的主请求实例 */
export const request = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        loadingPlugin({
            onShow: showLoading,
            onHide: hideLoading,
            delay: LOADING_DELAY,
        }),
        errorPlugin({
            onError(error) {
                const { log } = useErrorLog()
                log(`[${error.type}] ${error.message}`)
            },
        }),
        tokenPlugin({
            getToken: () => currentToken.value,
        }),
    ],
})

/** 无 Token 的请求实例（用于 401 演示） */
export const requestNoToken = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        errorPlugin({
            onError(error) {
                const { log } = useErrorLog()
                log(`[${error.type}] ${error.message}`)
            },
        }),
    ],
})

export { currentToken }
