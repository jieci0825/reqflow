<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import CacheDemo from './components/cache-demo.vue'
</script>

<template>
    <div class="cache-plugin">
        <CacheDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.cache-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
