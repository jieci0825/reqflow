<script setup lang="ts">
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { cachePlugin, errorPlugin } from 'reqflow/plugins'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useErrorLog } from '@/composables/use-error-log'
import { useLog } from '@/composables/use-log'

const ttl = ref(5000)
const responseDelay = ref(200)
const { logs, log, clear } = useLog()

let cacheKey = 0

const { log: errorLog } = useErrorLog()

const cachedRequest = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        cachePlugin({ ttl: ttl.value, methods: ['GET'] }),
        errorPlugin({
            onError(error) {
                errorLog(`[${error.type}] ${error.message}`)
            },
        }),
    ],
})

async function resetCacheCounter() {
    await fetch('/api/cache-test/reset', { method: 'POST' })
}

async function hitCache() {
    clear()
    await resetCacheCounter()
    const key = `hit-${++cacheKey}`
    const delay = responseDelay.value || 200

    log('info', `→ 第 1 次请求: GET /api/cache-test?key=${key}`)
    const r1 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← hitCount=${r1.data.data.hitCount}  timestamp=${r1.data.data.timestamp}`)

    log('info', `→ 第 2 次请求（相同参数，应命中缓存）`)
    const r2 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← hitCount=${r2.data.data.hitCount}  timestamp=${r2.data.data.timestamp}`)

    const cached = r1.data.data.hitCount === r2.data.data.hitCount
    log(
        cached ? 'success' : 'warn',
        cached
            ? '✓ 缓存命中，服务端只收到 1 次请求'
            : '✗ 缓存未命中，服务端收到了 2 次请求',
    )
}

async function ttlExpiry() {
    clear()
    await resetCacheCounter()
    const key = `ttl-${++cacheKey}`
    const delay = responseDelay.value || 200
    const currentTtl = ttl.value

    log('info', `→ 第 1 次请求: GET /api/cache-test?key=${key}`)
    const r1 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← hitCount=${r1.data.data.hitCount}`)

    log('info', `⏳ 等待 TTL 过期 (${currentTtl}ms)...`)
    await new Promise(r => setTimeout(r, currentTtl + 100))

    log('info', `→ 第 2 次请求（TTL 已过期，应重新请求）`)
    const r2 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← hitCount=${r2.data.data.hitCount}`)

    const expired = r2.data.data.hitCount === 2
    log(
        expired ? 'success' : 'warn',
        expired
            ? '✓ TTL 过期后重新走服务端，hitCount=2'
            : `✗ 结果异常，hitCount=${r2.data.data.hitCount}`,
    )
}

async function diffParams() {
    clear()
    await resetCacheCounter()
    const delay = responseDelay.value || 200
    const baseKey = `diff-${++cacheKey}`

    log('info', `→ 请求 A: key=${baseKey}-a`)
    const r1 = await cachedRequest.get('/api/cache-test', { params: { key: `${baseKey}-a`, delay } })
    log('success', `← hitCount=${r1.data.data.hitCount}  key=${r1.data.data.key}`)

    log('info', `→ 请求 B: key=${baseKey}-b（不同参数，不应命中 A 的缓存）`)
    const r2 = await cachedRequest.get('/api/cache-test', { params: { key: `${baseKey}-b`, delay } })
    log('success', `← hitCount=${r2.data.data.hitCount}  key=${r2.data.data.key}`)

    log('success', '✓ 不同参数各自独立缓存，均走了服务端')
}

async function skipCache() {
    clear()
    await resetCacheCounter()
    const key = `skip-${++cacheKey}`
    const delay = responseDelay.value || 200

    log('info', `→ 第 1 次请求（正常）`)
    const r1 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← hitCount=${r1.data.data.hitCount}`)

    log('info', `→ 第 2 次请求（meta.cache=false 强制跳过缓存）`)
    const r2 = await cachedRequest.get('/api/cache-test', { params: { key, delay }, meta: { cache: false } })
    log('success', `← hitCount=${r2.data.data.hitCount}`)

    const skipped = r2.data.data.hitCount === 2
    log(
        skipped ? 'success' : 'warn',
        skipped
            ? '✓ meta.cache=false 生效，服务端收到了 2 次请求'
            : `✗ 结果异常，hitCount=${r2.data.data.hitCount}`,
    )
}

async function deepCloneCheck() {
    clear()
    await resetCacheCounter()
    const key = `clone-${++cacheKey}`
    const delay = responseDelay.value || 200

    log('info', `→ 第 1 次请求`)
    const r1 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← data.hitCount=${r1.data.data.hitCount}`)

    log('info', `✏️ 修改返回值: r1.data.data.hitCount = 999`)
    r1.data.data.hitCount = 999

    log('info', `→ 第 2 次请求（应命中缓存，且不受上面修改影响）`)
    const r2 = await cachedRequest.get('/api/cache-test', { params: { key, delay } })
    log('success', `← data.hitCount=${r2.data.data.hitCount}`)

    const cloned = r2.data.data.hitCount === 1
    log(
        cloned ? 'success' : 'warn',
        cloned
            ? '✓ 缓存返回深拷贝，外部修改不影响缓存数据'
            : '✗ 缓存被外部修改污染',
    )
}
</script>

<template>
    <DemoCard
        title="cachePlugin 演示"
        badge="CACHE"
        badge-color="green"
        :border-color="'rgba(74, 222, 128, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>cachePlugin</code> 对 GET 请求结果进行缓存，
                在 TTL 有效期内直接返回缓存数据，避免重复请求服务端
            </p>
            <div class="form-row">
                <label>
                    缓存 TTL(ms)：
                    <input
                        v-model.number="ttl"
                        type="number"
                        min="1000"
                        max="60000"
                    />
                </label>
                <label>
                    响应延迟(ms)：
                    <input
                        v-model.number="responseDelay"
                        type="number"
                        min="100"
                        max="5000"
                    />
                </label>
            </div>
            <div class="btn-group">
                <button @click="hitCache">缓存命中</button>
                <button @click="ttlExpiry">TTL 过期</button>
                <button @click="diffParams">不同参数</button>
                <button @click="skipCache">跳过缓存（meta.cache=false）</button>
                <button @click="deepCloneCheck">深拷贝验证</button>
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
