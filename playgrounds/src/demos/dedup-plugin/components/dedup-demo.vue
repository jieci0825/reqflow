<script setup lang="ts">
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { dedupPlugin, errorPlugin } from 'reqflow/plugins'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useErrorLog } from '@/composables/use-error-log'
import { useLog } from '@/composables/use-log'

const concurrentCount = ref(3)
const responseDelay = ref(500)
const { logs, log, clear } = useLog()

let dedupKey = 0

const { log: errorLog } = useErrorLog()

const dedupRequest = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        dedupPlugin(),
        errorPlugin({
            onError(error) {
                errorLog(`[${error.type}] ${error.message}`)
            },
        }),
    ],
})

async function resetDedupCounter() {
    await fetch('/api/dedup-test/reset', { method: 'POST' })
}

async function sameRequests() {
    clear()
    await resetDedupCounter()
    const count = concurrentCount.value || 3
    const delay = responseDelay.value || 500
    const key = `same-${++dedupKey}`

    log('info', `→ 并发 ${count} 个相同请求: GET /api/dedup-test?key=${key}&delay=${delay}`)
    log('info', '预期: 服务端仅收到 1 次请求，所有调用者共享同一个响应')

    const promises = Array.from({ length: count }, () =>
        dedupRequest.get('/api/dedup-test', { params: { key, delay } }),
    )

    const results = await Promise.all(promises)
    for (let i = 0; i < results.length; i++) {
        const res = results[i]
        log('success', `调用者 #${i + 1} ← hitCount=${res.data.data.hitCount} ${res.data.data.message}`)
    }

    const allSame = results.every(r => r === results[0])
    log(
        allSame ? 'success' : 'warn',
        `所有 Promise 引用相同: ${allSame ? '✓ 是（去重生效）' : '✗ 否'}`,
    )
}

async function diffRequests() {
    clear()
    await resetDedupCounter()
    const delay = responseDelay.value || 500
    const baseKey = `diff-${++dedupKey}`

    log('info', '→ 并发 3 个不同请求（key 不同）')
    log('info', '预期: 服务端收到 3 次请求，每个 hitCount 都为 1')

    const promises = [
        dedupRequest.get('/api/dedup-test', { params: { key: `${baseKey}-a`, delay } }),
        dedupRequest.get('/api/dedup-test', { params: { key: `${baseKey}-b`, delay } }),
        dedupRequest.get('/api/dedup-test', { params: { key: `${baseKey}-c`, delay } }),
    ]

    const results = await Promise.all(promises)
    for (let i = 0; i < results.length; i++) {
        const res = results[i]
        log('success', `请求 #${i + 1} ← hitCount=${res.data.data.hitCount} key=${res.data.data.key}`)
    }
}

async function skipDedup() {
    clear()
    await resetDedupCounter()
    const count = concurrentCount.value || 3
    const delay = responseDelay.value || 500
    const key = `skip-${++dedupKey}`

    log('info', `→ 并发 ${count} 个相同请求，全部设置 meta.dedup=false`)
    log('info', `预期: 跳过去重，服务端收到 ${count} 次请求`)

    const promises = Array.from({ length: count }, () =>
        dedupRequest.get('/api/dedup-test', { params: { key, delay }, meta: { dedup: false } }),
    )

    const results = await Promise.all(promises)
    for (let i = 0; i < results.length; i++) {
        const res = results[i]
        log('success', `调用者 #${i + 1} ← hitCount=${res.data.data.hitCount}`)
    }

    const maxHit = Math.max(...results.map(r => r.data.data.hitCount))
    log(
        maxHit === count ? 'success' : 'warn',
        `服务端最大命中计数: ${maxHit}（预期 ${count}）${maxHit === count ? ' ✓ 去重已跳过' : ''}`,
    )
}

async function sequentialRequests() {
    clear()
    await resetDedupCounter()
    const delay = responseDelay.value || 500
    const key = `seq-${++dedupKey}`

    log('info', '→ 先发第 1 个请求并等待完成，再发第 2 个相同请求')
    log('info', '预期: 两次请求都到达服务端（第一个已释放，不再去重）')

    const res1 = await dedupRequest.get('/api/dedup-test', { params: { key, delay } })
    log('success', `第 1 次 ← hitCount=${res1.data.data.hitCount}`)

    const res2 = await dedupRequest.get('/api/dedup-test', { params: { key, delay } })
    log('success', `第 2 次 ← hitCount=${res2.data.data.hitCount}`)

    log(
        res2.data.data.hitCount === 2 ? 'success' : 'warn',
        `第 2 次 hitCount=${res2.data.data.hitCount}（预期 2）${res2.data.data.hitCount === 2 ? ' ✓ 已释放，正常发送' : ''}`,
    )
}
</script>

<template>
    <DemoCard
        title="dedupPlugin 演示"
        badge="DEDUP"
        badge-color="teal"
        :border-color="'rgba(45, 212, 191, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>dedupPlugin</code> 对并发的相同请求去重，
                多次相同调用共享同一个 Promise，服务端只收到一次请求
            </p>
            <div class="form-row">
                <label>
                    并发数量：
                    <input
                        v-model.number="concurrentCount"
                        type="number"
                        min="2"
                        max="10"
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
                <button @click="sameRequests">并发相同请求</button>
                <button @click="diffRequests">并发不同请求</button>
                <button @click="skipDedup">跳过去重（meta.dedup=false）</button>
                <button @click="sequentialRequests">顺序发送（验证释放）</button>
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
