import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'reqflow/adapters/fetch': resolve(__dirname, '../../dist/adapters/fetch.mjs'),
            'reqflow/plugins': resolve(__dirname, '../../dist/plugins.mjs'),
            'reqflow': resolve(__dirname, '../../dist/index.mjs'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3456',
                changeOrigin: true,
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/styles/variables" as *;\n`,
            },
        },
    },
})
