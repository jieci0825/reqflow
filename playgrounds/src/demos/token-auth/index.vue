<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import WithToken from './components/with-token.vue'
import WithoutToken from './components/without-token.vue'
</script>

<template>
    <div class="token-auth">
        <WithToken />
        <WithoutToken />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.token-auth {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
