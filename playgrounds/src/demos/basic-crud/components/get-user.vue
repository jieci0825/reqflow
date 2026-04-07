<script setup lang="ts">
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const userId = ref(1)
const { logs, log, clear } = useLog()

async function fetchUser() {
    clear()
    log('info', `→ GET /api/users/${userId.value}`)
    try {
        const res = await request.get(`/api/users/${userId.value}`)
        log('success', `← ${res.status} ${res.statusText}`)
        log('success', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/users/:id"
        badge="GET"
        badge-color="accent"
        description="使用 request.get() 获取单个用户"
    >
        <div class="form-row">
            <label>
                用户 ID：
                <input
                    v-model.number="userId"
                    type="number"
                    min="1"
                />
            </label>
        </div>
        <button @click="fetchUser">发送请求</button>
        <OutputPanel :logs="logs" />
    </DemoCard>
</template>

<style scoped lang="scss">
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
</style>
