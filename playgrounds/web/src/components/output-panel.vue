<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import type { LogEntry } from '@/composables/use-log'

const props = defineProps<{
    logs: LogEntry[]
}>()

const panelRef = ref<HTMLPreElement>()

watch(
    () => props.logs.length,
    async () => {
        await nextTick()
        if (panelRef.value) {
            panelRef.value.scrollTop = panelRef.value.scrollHeight
        }
    },
)
</script>

<template>
    <pre
        ref="panelRef"
        class="output-panel"
    >
        <template v-if="logs.length === 0">
            <span class="output-panel__placeholder">等待请求...</span>
        </template>
        <template v-else>
            <div
                v-for="(entry, idx) in logs"
                :key="idx"
                :class="`output-panel__log--${entry.type}`"
            >{{ entry.content }}</div>
        </template>
    </pre>
</template>

<style scoped lang="scss">
.output-panel {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.8rem;
    line-height: 1.7;
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--text-secondary);

    &__placeholder {
        color: #444;
    }

    &__log--info {
        color: var(--text-secondary);
    }

    &__log--success {
        color: var(--green);
    }

    &__log--error {
        color: var(--red);
    }

    &__log--warn {
        color: var(--orange);
    }
}
</style>
