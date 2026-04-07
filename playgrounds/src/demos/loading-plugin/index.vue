<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import LoadingDemo from './components/loading-demo.vue'
</script>

<template>
    <div class="loading-plugin">
        <LoadingDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.loading-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
