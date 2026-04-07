<script setup lang="ts">
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { dualTokenPlugin, errorPlugin } from 'reqflow/plugins'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useErrorLog } from '@/composables/use-error-log'
import { useLog } from '@/composables/use-log'

const { logs, log, clear } = useLog()
const { log: errorLog } = useErrorLog()

const accessToken = ref('initial-access-token')
const refreshToken = ref('initial-refresh-token')

const dualRequest = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        dualTokenPlugin({
            getAccessToken: () => accessToken.value,
            getRefreshToken: () => refreshToken.value,
            refreshURL: '/api/auth/refresh',
            onRefreshSuccess(tokens) {
                accessToken.value = tokens.access
                refreshToken.value = tokens.refresh
                log('success', `Token 已刷新 → access: ${tokens.access}, refresh: ${tokens.refresh}`)
            },
            onRefreshFail() {
                log('error', 'Token 刷新失败，需要重新登录')
            },
        }),
        errorPlugin({
            onError(error) {
                errorLog(`[${error.type}] ${error.message}`)
            },
        }),
    ],
})

async function resetServer() {
    await fetch('/api/dual-token/reset', { method: 'POST' })
    accessToken.value = 'initial-access-token'
    refreshToken.value = 'initial-refresh-token'
}

async function normalRequest() {
    clear()
    await resetServer()
    log('info', `→ GET /api/dual-protected（当前 access: ${accessToken.value}）`)

    try {
        const res = await dualRequest.get('/api/dual-protected')
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function singleRefresh() {
    clear()
    await resetServer()
    log('info', '1. 先让 access token 失效...')
    await fetch('/api/dual-token/expire-access', { method: 'POST' })
    log('info', `2. → GET /api/dual-protected（过期的 access: ${accessToken.value}）`)
    log('info', '   预期: 返回 401 → 自动刷新 → 用新 token 重试 → 成功')

    try {
        const res = await dualRequest.get('/api/dual-protected')
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        log('info', `   最终 token → access: ${accessToken.value}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function concurrentRefresh() {
    clear()
    await resetServer()
    log('info', '1. 先让 access token 失效...')
    await fetch('/api/dual-token/expire-access', { method: 'POST' })
    log('info', '2. → 并发 3 个请求，全部遇到 401')
    log('info', '   预期: 只触发一次刷新，三个请求在刷新后全部重试成功')

    try {
        const results = await Promise.all([
            dualRequest.get('/api/dual-protected', { params: { tag: 'A' } }),
            dualRequest.get('/api/dual-protected', { params: { tag: 'B' } }),
            dualRequest.get('/api/dual-protected', { params: { tag: 'C' } }),
        ])

        results.forEach((res, i) => {
            log('success', `请求 ${['A', 'B', 'C'][i]} ← ${res.status} ${JSON.stringify(res.data)}`)
        })
        log('info', `   最终 token → access: ${accessToken.value}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function refreshFail() {
    clear()
    await resetServer()
    log('info', '1. 同时失效 access token 和 refresh token...')
    await fetch('/api/dual-token/invalidate-refresh', { method: 'POST' })
    log('info', `2. → GET /api/dual-protected`)
    log('info', '   预期: 401 → 刷新失败 → onRefreshFail 触发 → 请求被拒绝')

    try {
        const res = await dualRequest.get('/api/dual-protected')
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="dualTokenPlugin 演示"
        badge="DUAL-TOKEN"
        badge-color="purple"
        :border-color="'rgba(167, 139, 250, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>dualTokenPlugin</code> 实现双 token 自动续期：
                请求 401 时自动用 refresh token 刷新，并发 401 共享同一次刷新
            </p>

            <div class="token-info">
                <div class="token-row">
                    <span class="token-label">Access Token：</span>
                    <code class="token-value">{{ accessToken }}</code>
                </div>
                <div class="token-row">
                    <span class="token-label">Refresh Token：</span>
                    <code class="token-value">{{ refreshToken }}</code>
                </div>
            </div>

            <div class="btn-group">
                <button @click="normalRequest">正常请求</button>
                <button @click="singleRefresh">单次 401 自动刷新</button>
                <button @click="concurrentRefresh">并发 401（共享刷新）</button>
                <button @click="refreshFail">刷新失败</button>
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

.token-info {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    margin-bottom: 0.75rem;

    .token-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.2rem 0;
        font-size: 0.8rem;
    }

    .token-label {
        color: var(--text-secondary);
        flex-shrink: 0;
    }

    .token-value {
        color: var(--accent);
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 0.78rem;
        word-break: break-all;
    }
}

.btn-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}
</style>
