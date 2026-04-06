import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    test: {
        globals: true,
        passWithNoTests: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
})
