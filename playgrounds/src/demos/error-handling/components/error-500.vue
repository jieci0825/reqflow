<script setup lang="ts">
import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const { logs, log, clear } = useLog()

async function triggerError() {
    clear()
    log('info', '→ GET /api/error/500')
    try {
        const res = await request.get('/api/error/500')
        log('warn', `← ${res.status} ${res.statusText}`)
        log('warn', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/error/500"
        badge="ERROR"
        badge-color="red"
        description="触发 HTTP 500 错误，验证 errorPlugin 的 onError 回调"
    >
        <button @click="triggerError">发送请求</button>
        <OutputPanel :logs="logs" />
    </DemoCard>
</template>
