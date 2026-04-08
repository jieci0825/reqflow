<script setup lang="ts">
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { errorPlugin, retryPlugin } from 'reqflow/plugins'
import type { RetryPluginOptions } from 'reqflow/plugins'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useErrorLog } from '@/composables/use-error-log'
import { useLog } from '@/composables/use-log'

const maxRetries = ref(3)
const failCount = ref(2)
const { logs, log, clear } = useLog()

let retryKey = 0

function createRetryRequest(retryOpts: RetryPluginOptions) {
    const { log: errorLog } = useErrorLog()
    return createRequest({
        adapter: fetchAdapter(),
        baseURL: '',
        plugins: [
            retryPlugin(retryOpts),
            errorPlugin({
                onError(error) {
                    errorLog(`[${error.type}] ${error.message}`)
                },
            }),
        ],
    })
}

async function basicRetry() {
    clear()
    const key = `basic-${++retryKey}`
    log(
        'info',
        `配置: maxRetries=${maxRetries.value}, delay=0, 服务端失败${failCount.value}次后成功`
    )
    log('info', `→ GET /api/flaky/${failCount.value}`)

    const req = createRetryRequest({ maxRetries: maxRetries.value })
    try {
        const res = await req.get(`/api/flaky/${failCount.value}?key=${key}`)
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        const retries =
            (res.config?.meta as Record<string, number>)?.retryCount || 0
        log('success', `共重试 ${retries} 次`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function delayRetry() {
    clear()
    const key = `delay-${++retryKey}`
    log(
        'info',
        `配置: maxRetries=${maxRetries.value}, delay=500ms, 服务端失败${failCount.value}次后成功`
    )
    log('info', `→ GET /api/flaky/${failCount.value}`)

    const req = createRetryRequest({ maxRetries: maxRetries.value, delay: 500 })
    try {
        const res = await req.get(`/api/flaky/${failCount.value}?key=${key}`)
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        const retries =
            (res.config?.meta as Record<string, number>)?.retryCount || 0
        log('success', `共重试 ${retries} 次，每次间隔 500ms`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function backoffRetry() {
    clear()
    const key = `backoff-${++retryKey}`
    const backoffFn = (attempt: number) =>
        Math.min(1000 * Math.pow(2, attempt - 1), 8000)
    const sequence = Array.from(
        { length: maxRetries.value },
        (_, i) => backoffFn(i + 1) + 'ms'
    ).join(' → ')

    log(
        'info',
        `配置: maxRetries=${maxRetries.value}, delay=指数退避 min(1000*2^(n-1), 8000)ms`
    )
    log('info', `退避序列: ${sequence}`)
    log('info', `→ GET /api/flaky/${failCount.value}`)

    const req = createRetryRequest({
        maxRetries: maxRetries.value,
        delay: backoffFn,
    })
    try {
        const res = await req.get(`/api/flaky/${failCount.value}?key=${key}`)
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        const retries =
            (res.config?.meta as Record<string, number>)?.retryCount || 0
        log('success', `共重试 ${retries} 次（指数退避）`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function failAllRetry() {
    clear()
    const key = `fail-${++retryKey}`
    const totalFail = maxRetries.value + 5

    log(
        'info',
        `配置: maxRetries=${maxRetries.value}, 服务端持续失败${totalFail}次`
    )
    log('info', `预期: 重试 ${maxRetries.value} 次后仍失败，返回最后的错误响应`)
    log('info', `→ GET /api/flaky/${totalFail}`)

    const req = createRetryRequest({ maxRetries: maxRetries.value, delay: 300 })
    try {
        const res = await req.get(`/api/flaky/${totalFail}?key=${key}`)
        if (res.status >= 400) {
            log('warn', `← ${res.status} ${JSON.stringify(res.data)}`)
            log('warn', '重试耗尽，返回最终失败响应')
        } else {
            log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        }
    } catch (err: unknown) {
        log('error', `✗ 重试耗尽: ${(err as Error).message}`)
    }
}

async function conditionRetry() {
    clear()
    const key = `cond-${++retryKey}`

    log(
        'info',
        `配置: maxRetries=${maxRetries.value}, retryOn=仅 HTTP 5xx 错误`
    )
    log('info', '→ GET /api/flaky/2 (5xx 错误，会重试)')

    const retryOn = (error: { type: string; status?: number }) =>
        error.type === 'http' && (error.status ?? 0) >= 500

    const req = createRetryRequest({
        maxRetries: maxRetries.value,
        delay: 300,
        retryOn,
    })

    try {
        const res = await req.get(`/api/flaky/2?key=${key}`)
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        const retries =
            (res.config?.meta as Record<string, number>)?.retryCount || 0
        log('success', `共重试 ${retries} 次（仅 5xx 条件触发）`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }

    log('info', '')
    log(
        'info',
        '→ GET /api/protected (401 错误，不满足 retryOn 条件，不会重试)'
    )

    const req2 = createRetryRequest({
        maxRetries: maxRetries.value,
        delay: 300,
        retryOn,
    })

    try {
        const res = await req2.get('/api/protected')
        log('warn', `← ${res.status} ${JSON.stringify(res.data)}`)
        log('warn', '401 不满足 5xx 条件，未重试，直接返回')
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="retryPlugin 演示"
        badge="RETRY"
        badge-color="purple"
        :border-color="'rgba(167, 139, 250, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>retryPlugin</code> 在请求失败时自动重试，
                支持固定延迟与指数退避策略
            </p>
            <div class="form-row">
                <label>
                    最大重试次数：
                    <input
                        v-model.number="maxRetries"
                        type="number"
                        min="1"
                        max="10"
                    />
                </label>
                <label>
                    服务端失败次数：
                    <input
                        v-model.number="failCount"
                        type="number"
                        min="0"
                        max="10"
                    />
                </label>
            </div>
            <div class="btn-group">
                <button @click="basicRetry">基本重试（无延迟）</button>
                <button @click="delayRetry">固定延迟（500ms）</button>
                <button @click="backoffRetry">指数退避</button>
                <button @click="failAllRetry">重试全部失败</button>
                <button @click="conditionRetry">条件重试（仅 5xx）</button>
            </div>
            <OutputPanel :logs="logs" />
        </template>
    </DemoCard>
</template>

<style scoped lang="scss">
.desc {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
}

.form-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;

    label {
        font-size: 0.85rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
}

.btn-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}
</style>
