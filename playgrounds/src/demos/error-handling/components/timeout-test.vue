<script setup lang="ts">
import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const { logs, log, clear } = useLog()

async function triggerTimeout() {
    clear()
    log('info', '→ GET /api/slow (timeout: 1000ms)')
    try {
        const res = await request.get('/api/slow', { timeout: 1000 })
        log('success', `← ${res.status} ${res.statusText}`)
        log('success', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ 请求超时或中止: ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/slow（超时 1s）"
        badge="TIMEOUT"
        badge-color="red"
        description="服务端延迟 3s 响应，客户端超时设为 1s，验证超时中止行为"
    >
        <button @click="triggerTimeout">发送请求</button>
        <OutputPanel :logs="logs" />
    </DemoCard>
</template>
