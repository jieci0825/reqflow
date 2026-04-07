<script setup lang="ts">
import { useErrorLog } from '@/composables/use-error-log'
import OutputPanel from './output-panel.vue'

const { logs, clear } = useErrorLog()
</script>

<template>
    <section class="error-log">
        <div class="error-log__header">
            <h2 class="error-log__title">errorPlugin 日志</h2>
            <button
                class="error-log__btn"
                @click="clear"
            >
                清空
            </button>
        </div>
        <p class="error-log__desc">所有经过 errorPlugin onError 回调的错误信息</p>
        <OutputPanel :logs="logs" />
    </section>
</template>

<style scoped lang="scss">
.error-log {
    background: var(--surface);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    &__title {
        font-size: 1rem;
        font-weight: 600;
        font-family: 'SF Mono', 'Fira Code', monospace;
    }

    &__btn {
        padding: 0.25rem 0.6rem;
        font-size: 0.75rem;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);

        &:hover {
            border-color: var(--text-secondary);
        }
    }

    &__desc {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
    }
}
</style>
