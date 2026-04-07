<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

import { navItems } from '@/router'

const route = useRoute()
</script>

<template>
    <aside class="sidebar">
        <div class="sidebar__header">
            <h1 class="sidebar__title">Reqflow</h1>
            <p class="sidebar__subtitle">Playground</p>
        </div>
        <nav class="sidebar__nav">
            <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                class="sidebar__link"
                :class="{ 'sidebar__link--active': route.path === item.path }"
            >
                <span
                    class="sidebar__badge"
                    :data-color="item.badgeColor"
                >
                    {{ item.badge }}
                </span>
                <span class="sidebar__label">{{ item.label }}</span>
            </RouterLink>
        </nav>
        <div class="sidebar__footer">
            <p>基于 dist 产物的端到端验证</p>
        </div>
    </aside>
</template>

<style scoped lang="scss">
.sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100%;

    &__header {
        padding: 1.5rem 1.25rem 1rem;
        border-bottom: 1px solid var(--border);
    }

    &__title {
        font-size: 1.4rem;
        font-weight: 700;
        background: linear-gradient(135deg, var(--accent), var(--purple));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    &__subtitle {
        color: var(--text-secondary);
        font-size: 0.8rem;
        margin-top: 0.15rem;
    }

    &__nav {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    &__link {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.55rem 0.75rem;
        border-radius: 8px;
        text-decoration: none;
        color: var(--text-secondary);
        font-size: 0.85rem;
        transition: all 0.15s;

        &:hover {
            background: rgba(108, 140, 255, 0.08);
            color: var(--text);
        }

        &--active {
            background: rgba(108, 140, 255, 0.12);
            color: var(--text);
        }
    }

    &__badge {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 0.15em 0.5em;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        flex-shrink: 0;
        min-width: 3rem;
        text-align: center;

        &[data-color='accent'] {
            background: rgba(108, 140, 255, 0.2);
            color: var(--accent);
        }

        &[data-color='purple'] {
            background: rgba(167, 139, 250, 0.2);
            color: var(--purple);
        }

        &[data-color='red'] {
            background: rgba(248, 113, 113, 0.2);
            color: var(--red);
        }

        &[data-color='orange'] {
            background: rgba(251, 146, 60, 0.2);
            color: var(--orange);
        }

        &[data-color='teal'] {
            background: rgba(45, 212, 191, 0.2);
            color: var(--teal);
        }
    }

    &__label {
        white-space: nowrap;
    }

    &__footer {
        padding: 1rem 1.25rem;
        border-top: 1px solid var(--border);

        p {
            color: var(--text-secondary);
            font-size: 0.75rem;
        }
    }
}
</style>
