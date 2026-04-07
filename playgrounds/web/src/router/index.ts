import { createRouter, createWebHistory } from 'vue-router'

export const navItems = [
    {
        path: '/basic-crud',
        label: '基础 CRUD',
        badge: 'CRUD',
        badgeColor: 'accent',
    },
    {
        path: '/token-auth',
        label: 'Token 认证',
        badge: 'AUTH',
        badgeColor: 'purple',
    },
    {
        path: '/error-handling',
        label: '错误处理',
        badge: 'ERROR',
        badgeColor: 'red',
    },
    {
        path: '/loading-plugin',
        label: 'Loading 插件',
        badge: 'LOADING',
        badgeColor: 'orange',
    },
    {
        path: '/retry-plugin',
        label: 'Retry 插件',
        badge: 'RETRY',
        badgeColor: 'purple',
    },
    {
        path: '/dedup-plugin',
        label: 'Dedup 插件',
        badge: 'DEDUP',
        badgeColor: 'teal',
    },
    {
        path: '/cache-plugin',
        label: 'Cache 插件',
        badge: 'CACHE',
        badgeColor: 'green',
    },
    {
        path: '/race-plugin',
        label: 'Race 插件',
        badge: 'RACE',
        badgeColor: 'cyan',
    },
    {
        path: '/dual-token-plugin',
        label: 'Dual Token 插件',
        badge: 'DUAL-TOKEN',
        badgeColor: 'purple',
    },
] as const

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/basic-crud' },
        {
            path: '/basic-crud',
            component: () => import('@/demos/basic-crud/index.vue'),
        },
        {
            path: '/token-auth',
            component: () => import('@/demos/token-auth/index.vue'),
        },
        {
            path: '/error-handling',
            component: () => import('@/demos/error-handling/index.vue'),
        },
        {
            path: '/loading-plugin',
            component: () => import('@/demos/loading-plugin/index.vue'),
        },
        {
            path: '/retry-plugin',
            component: () => import('@/demos/retry-plugin/index.vue'),
        },
        {
            path: '/dedup-plugin',
            component: () => import('@/demos/dedup-plugin/index.vue'),
        },
        {
            path: '/cache-plugin',
            component: () => import('@/demos/cache-plugin/index.vue'),
        },
        {
            path: '/race-plugin',
            component: () => import('@/demos/race-plugin/index.vue'),
        },
        {
            path: '/dual-token-plugin',
            component: () => import('@/demos/dual-token-plugin/index.vue'),
        },
    ],
})
