<script setup lang="ts">
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const delayMs = ref(2000)
const { logs, log, clear } = useLog()

async function slowRequest() {
    clear()
    const ms = delayMs.value || 2000
    log('info', `→ GET /api/delay/${ms}`)
    log('info', 'loading 配置: delay=200ms，请求 >200ms 时顶部加载条出现')
    try {
        const res = await request.get(`/api/delay/${ms}`)
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function fastRequest() {
    clear()
    log('info', '→ GET /api/delay/50')
    log('info', '请求仅 50ms，低于 delay=200ms 阈值，加载条不会出现')
    try {
        const res = await request.get('/api/delay/50')
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function silentRequest() {
    clear()
    log('info', '→ GET /api/delay/2000 (meta.silent = true)')
    log('info', 'silent 请求不参与 loading 计数，加载条不会出现')
    try {
        const res = await request.get('/api/delay/2000', { meta: { silent: true } })
        log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}

async function concurrentRequests() {
    clear()
    log('info', '→ 并发 3 个请求: /api/delay/1000, /api/delay/2000, /api/delay/3000')
    log('info', '加载条在第一个请求进入时出现，最后一个完成后消失')
    try {
        const results = await Promise.all([
            request.get('/api/delay/1000'),
            request.get('/api/delay/2000'),
            request.get('/api/delay/3000'),
        ])
        for (const res of results) {
            log('success', `← ${res.status} ${JSON.stringify(res.data)}`)
        }
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="loadingPlugin 演示"
        badge="LOADING"
        badge-color="orange"
        :border-color="'rgba(251, 146, 60, 0.3)'"
    >
        <template #default>
            <p class="desc">
                页面顶部的加载指示条由 <code>loadingPlugin</code> 驱动，
                配置 <code>delay: 200</code> 避免快速请求闪烁
            </p>
            <div class="form-row">
                <label>
                    延迟(ms)：
                    <input
                        v-model.number="delayMs"
                        type="number"
                        min="0"
                        max="10000"
                    />
                </label>
            </div>
            <div class="btn-group">
                <button @click="slowRequest">慢速请求</button>
                <button @click="fastRequest">快速请求（50ms）</button>
                <button @click="silentRequest">静默请求（不触发）</button>
                <button @click="concurrentRequests">并发 3 个请求</button>
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
