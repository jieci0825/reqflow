<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import RaceDemo from './components/race-demo.vue'
</script>

<template>
    <div class="race-plugin">
        <RaceDemo />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.race-plugin {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
