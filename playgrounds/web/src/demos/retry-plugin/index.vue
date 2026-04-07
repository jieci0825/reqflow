<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import RetryDemo from './components/retry-demo.vue'
</script>

<template>
    <div class="retry-plugin">
        <RetryDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.retry-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
