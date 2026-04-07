<script setup lang="ts">
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { request } from '@/composables/use-request'

const name = ref('赵六')
const email = ref('zhaoliu@example.com')
const { logs, log, clear } = useLog()

async function createUser() {
    clear()
    const body = { name: name.value, email: email.value }
    log('info', `→ POST /api/users  body: ${JSON.stringify(body)}`)
    try {
        const res = await request.post('/api/users', body, {
            headers: { 'Content-Type': 'application/json' },
        })
        log('success', `← ${res.status} ${res.statusText}`)
        log('success', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="POST /api/users"
        badge="POST"
        badge-color="green"
        description="使用 request.post() 创建新用户"
    >
        <div class="form-row">
            <label>
                姓名：
                <input
                    v-model="name"
                    type="text"
                />
            </label>
            <label>
                邮箱：
                <input
                    v-model="email"
                    type="text"
                />
            </label>
        </div>
        <button @click="createUser">发送请求</button>
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
