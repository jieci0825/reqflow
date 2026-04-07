<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import DedupDemo from './components/dedup-demo.vue'
</script>

<template>
    <div class="dedup-plugin">
        <DedupDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.dedup-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
