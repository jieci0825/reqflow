<script setup lang="ts">
import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const { logs, log, clear } = useLog()

async function fetchUsers() {
    clear()
    log('info', '→ GET /api/users')
    try {
        const res = await request.get('/api/users')
        log('success', `← ${res.status} ${res.statusText}`)
        log('success', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/users"
        badge="GET"
        badge-color="accent"
        description="使用 request.get() 获取用户列表"
    >
        <button @click="fetchUsers">发送请求</button>
        <OutputPanel :logs="logs" />
    </DemoCard>
</template>
