<script setup lang="ts">
import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'
import { currentToken, request } from '@/composables/use-request'

const { logs, log, clear } = useLog()

async function fetchProtected() {
    clear()
    log('info', `→ GET /api/protected (token: ${currentToken.value})`)
    try {
        const res = await request.get('/api/protected')
        log('success', `← ${res.status} ${res.statusText}`)
        log('success', JSON.stringify(res.data, null, 2))
    } catch (err: unknown) {
        log('error', `✗ ${(err as Error).message}`)
    }
}
</script>

<template>
    <DemoCard
        title="GET /api/protected（有 Token）"
        badge="AUTH"
        badge-color="purple"
        description="tokenPlugin 自动注入 Authorization 头，服务端回显收到的令牌"
    >
        <div class="form-row">
            <label>
                Token：
                <input
                    v-model="currentToken"
                    type="text"
                />
            </label>
        </div>
        <button @click="fetchProtected">发送请求</button>
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
