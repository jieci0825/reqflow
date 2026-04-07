<script setup lang="ts">
import AppSidebar from '@/components/app-sidebar.vue'
import { isLoading } from '@/composables/use-request'
</script>

<template>
    <div class="app">
        <div
            class="loading-bar"
            :class="{ active: isLoading }"
        />
        <AppSidebar />
        <main class="app__content">
            <RouterView />
        </main>
    </div>
</template>

<style scoped lang="scss">
.app {
    display: flex;
    height: 100%;

    &__content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }
}

.loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(
        90deg,
        var(--accent),
        var(--purple),
        var(--accent)
    );
    background-size: 200% 100%;
    opacity: 0;
    z-index: 9999;
    pointer-events: none;
    transition: opacity 0.2s;

    &.active {
        opacity: 1;
        animation: loading-slide 1.5s ease-in-out infinite;
    }
}

@keyframes loading-slide {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}
</style>
