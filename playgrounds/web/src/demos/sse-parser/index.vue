<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import SseDemo from './components/sse-demo.vue'
</script>

<template>
    <div class="sse-parser">
        <SseDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.sse-parser {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
