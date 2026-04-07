<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import Error500 from './components/error-500.vue'
import TimeoutTest from './components/timeout-test.vue'
</script>

<template>
    <div class="error-handling">
        <Error500 />
        <TimeoutTest />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.error-handling {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
