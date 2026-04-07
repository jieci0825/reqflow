<script setup lang="ts">
import ErrorLog from '@/components/error-log.vue'

import GetUser from './components/get-user.vue'
import GetUsers from './components/get-users.vue'
import PostUser from './components/post-user.vue'
</script>

<template>
    <div class="basic-crud">
        <GetUsers />
        <GetUser />
        <PostUser />
        <ErrorLog />
    </div>
</template>

<style scoped lang="scss">
.basic-crud {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
</style>
