<script setup lang="ts">
import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { requestNoToken } from '@/composables/use-request'

const { logs, log, clear } = useLog()

async function fetchProtectedNoToken() {
    clear()
    log('info', '→ GET /api/protected (无 token)')
    try {
        const res = await requestNoToken.get('/api/protected')
        log('warn', `← ${res.status} ${res.statusText}`)
        log('warn', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/protected（无 Token）"
        badge="AUTH"
        badge-color="purple"
        description="将 token 置空后发送请求，预期返回 401 并触发 errorPlugin"
    >
        <button @click="fetchProtectedNoToken">发送请求</button>
        <OutputPanel :logs="logs" />
    </DemoCard>
</template>
