import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: {
        'index': 'src/index.ts',
        'adapters/fetch': 'src/adapters/fetch.ts',
        'plugins': 'src/plugins/index.ts',
        'sse/index': 'src/sse/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: false,
})
