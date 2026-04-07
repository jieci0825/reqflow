<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import DualTokenDemo from './components/dual-token-demo.vue'
</script>

<template>
    <div class="dual-token-plugin">
        <DualTokenDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.dual-token-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
