<script setup lang="ts">
defineProps<{
    title: string
    badge?: string
    badgeColor?: string
    description?: string
    borderColor?: string
}>()
</script>

<template>
    <section
        class="demo-card"
        :style="borderColor ? `border-color: ${borderColor}` : undefined"
    >
        <div class="demo-card__header">
            <h2 class="demo-card__title">{{ title }}</h2>
            <span
                v-if="badge"
                class="demo-card__badge"
                :data-color="badgeColor"
            >
                {{ badge }}
            </span>
        </div>
        <p
            v-if="description"
            class="demo-card__desc"
        >
            {{ description }}
        </p>
        <slot />
    </section>
</template>

<style scoped lang="scss">
.demo-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;

    &__header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    &__title {
        font-size: 1rem;
        font-weight: 600;
        font-family: 'SF Mono', 'Fira Code', monospace;
    }

    &__badge {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.15em 0.6em;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        flex-shrink: 0;

        &[data-color='accent'] {
            background: rgba(108, 140, 255, 0.2);
            color: var(--accent);
        }

        &[data-color='green'] {
            background: rgba(74, 222, 128, 0.2);
            color: var(--green);
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

        &[data-color='cyan'] {
            background: rgba(34, 211, 238, 0.2);
            color: var(--cyan);
        }
    }

    &__desc {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
    }
}
</style>
