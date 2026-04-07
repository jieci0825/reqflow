<script setup lang="ts">
import { createRequest } from 'reqflow'
import { fetchAdapter } from 'reqflow/adapters/fetch'
import { errorPlugin, racePlugin } from 'reqflow/plugins'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useErrorLog } from '@/composables/use-error-log'
import { useLog } from '@/composables/use-log'

const rapidCount = ref(5)
const responseDelay = ref(800)
const { logs, log, clear } = useLog()

let raceSeq = 0

const { log: errorLog } = useErrorLog()

const raceRequest = createRequest({
    adapter: fetchAdapter(),
    baseURL: '',
    plugins: [
        racePlugin(),
        errorPlugin({
            onError(error) {
                errorLog(`[${error.type}] ${error.message}`)
            },
        }),
    ],
})

async function resetRaceCounter() {
    await fetch('/api/race-test/reset', { method: 'POST' })
}

async function raceRequests() {
    clear()
    await resetRaceCounter()
    const count = rapidCount.value || 5
    const delay = responseDelay.value || 800
    const key = `race-${++raceSeq}`

    log('info', `→ 快速连发 ${count} 个请求，raceKey="${key}"，响应延迟 ${delay}ms`)
    log('info', '预期: 前面的请求被 abort，只有最后一个成功返回')

    const promises: Promise<unknown>[] = []
    for (let i = 1; i <= count; i++) {
        promises.push(
            raceRequest
                .get('/api/race-test', {
                    params: { key: `${key}-${i}`, delay },
                    meta: { raceKey: key },
                })
                .then(res => {
                    log('success', `请求 #${i} ← 成功: ${res.data.data.message}`)
                    return { index: i, status: 'fulfilled' }
                })
                .catch(err => {
                    if (err instanceof DOMException && err.name === 'AbortError') {
                        log('warn', `请求 #${i} ← 已被竞态取消 (AbortError)`)
                    } else {
                        log('error', `请求 #${i} ← 异常: ${err.message}`)
                    }
                    return { index: i, status: 'rejected' }
                }),
        )
    }

    const results = await Promise.all(promises)
    const fulfilled = results.filter(r => (r as any).status === 'fulfilled').length
    const rejected = results.filter(r => (r as any).status === 'rejected').length
    log('info', `汇总: ${fulfilled} 个成功, ${rejected} 个被取消`)
}

async function noRaceKeyRequests() {
    clear()
    await resetRaceCounter()
    const delay = responseDelay.value || 800

    log('info', '→ 并发 3 个请求，不设置 raceKey')
    log('info', '预期: 所有请求正常完成，不受竞态影响')

    const promises = Array.from({ length: 3 }, (_, i) =>
        raceRequest
            .get('/api/race-test', {
                params: { key: `noracekey-${++raceSeq}-${i}`, delay },
            })
            .then(res => {
                log('success', `请求 #${i + 1} ← 成功: ${res.data.data.message}`)
            }),
    )

    await Promise.all(promises)
    log('info', '全部完成，无竞态取消')
}

async function diffRaceKeys() {
    clear()
    await resetRaceCounter()
    const delay = responseDelay.value || 800

    log('info', '→ 并发 3 个请求，分别使用不同 raceKey: a / b / c')
    log('info', '预期: 三个请求互不干扰，全部成功')

    const keys = ['a', 'b', 'c']
    const promises = keys.map((k, i) =>
        raceRequest
            .get('/api/race-test', {
                params: { key: `diffkey-${++raceSeq}-${k}`, delay },
                meta: { raceKey: k },
            })
            .then(res => {
                log('success', `请求 raceKey="${k}" ← 成功: ${res.data.data.message}`)
            })
            .catch(err => {
                log('error', `请求 raceKey="${k}" ← 异常: ${err.message}`)
            }),
    )

    await Promise.all(promises)
    log('info', '全部完成，不同 raceKey 互不干扰')
}

async function sequentialRace() {
    clear()
    await resetRaceCounter()
    const delay = 300
    const key = `seq-${++raceSeq}`

    log('info', `→ 先发第 1 个请求（raceKey="${key}"）并等待完成，再发第 2 个`)
    log('info', '预期: 两个请求都成功（前一个已完成，不存在竞态）')

    const res1 = await raceRequest.get('/api/race-test', {
        params: { key: `${key}-1`, delay },
        meta: { raceKey: key },
    })
    log('success', `第 1 次 ← ${res1.data.data.message}`)

    const res2 = await raceRequest.get('/api/race-test', {
        params: { key: `${key}-2`, delay },
        meta: { raceKey: key },
    })
    log('success', `第 2 次 ← ${res2.data.data.message}`)

    log('info', '两次请求均成功，前序完成后不影响后续请求')
}
</script>

<template>
    <DemoCard
        title="racePlugin 演示"
        badge="RACE"
        badge-color="cyan"
        :border-color="'rgba(34, 211, 238, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>racePlugin</code> 实现竞态取消：同一 <code>raceKey</code> 的新请求
                会自动 abort 前序请求，仅保留最后一次
            </p>
            <div class="form-row">
                <label>
                    连发数量：
                    <input
                        v-model.number="rapidCount"
                        type="number"
                        min="2"
                        max="20"
                    />
                </label>
                <label>
                    响应延迟(ms)：
                    <input
                        v-model.number="responseDelay"
                        type="number"
                        min="200"
                        max="5000"
                    />
                </label>
            </div>
            <div class="btn-group">
                <button @click="raceRequests">快速连发（竞态取消）</button>
                <button @click="noRaceKeyRequests">无 raceKey（正常请求）</button>
                <button @click="diffRaceKeys">不同 raceKey（互不干扰）</button>
                <button @click="sequentialRace">顺序发送（验证已完成不取消）</button>
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
