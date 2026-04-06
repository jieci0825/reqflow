import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const dist = resolve(root, 'dist')

function distPath(relative: string): string {
    return resolve(dist, relative)
}

describe('构建产物验证', () => {
    describe('ESM 产物存在', () => {
        it('主入口', () => {
            expect(existsSync(distPath('index.mjs'))).toBe(true)
        })

        it('adapters/fetch 入口', () => {
            expect(existsSync(distPath('adapters/fetch.mjs'))).toBe(true)
        })

        it('plugins 入口', () => {
            expect(existsSync(distPath('plugins.mjs'))).toBe(true)
        })
    })

    describe('CJS 产物存在', () => {
        it('主入口', () => {
            expect(existsSync(distPath('index.cjs'))).toBe(true)
        })

        it('adapters/fetch 入口', () => {
            expect(existsSync(distPath('adapters/fetch.cjs'))).toBe(true)
        })

        it('plugins 入口', () => {
            expect(existsSync(distPath('plugins.cjs'))).toBe(true)
        })
    })

    describe('类型声明存在', () => {
        it('ESM 主入口类型声明', () => {
            expect(existsSync(distPath('index.d.mts'))).toBe(true)
        })

        it('ESM adapters/fetch 类型声明', () => {
            expect(existsSync(distPath('adapters/fetch.d.mts'))).toBe(true)
        })

        it('ESM plugins 类型声明', () => {
            expect(existsSync(distPath('plugins.d.mts'))).toBe(true)
        })

        it('CJS 主入口类型声明', () => {
            expect(existsSync(distPath('index.d.cts'))).toBe(true)
        })

        it('CJS adapters/fetch 类型声明', () => {
            expect(existsSync(distPath('adapters/fetch.d.cts'))).toBe(true)
        })

        it('CJS plugins 类型声明', () => {
            expect(existsSync(distPath('plugins.d.cts'))).toBe(true)
        })
    })

    describe('ESM 模块可导入且导出正确', () => {
        it('主入口导出 createRequest 和 compose', async () => {
            const mod = await import(
                pathToFileURL(distPath('index.mjs')).href
            )
            expect(typeof mod.createRequest).toBe('function')
            expect(typeof mod.compose).toBe('function')
        })

        it('adapters/fetch 导出 fetchAdapter', async () => {
            const mod = await import(
                pathToFileURL(distPath('adapters/fetch.mjs')).href
            )
            expect(typeof mod.fetchAdapter).toBe('function')
        })

        it('plugins 导出 errorPlugin 和 tokenPlugin', async () => {
            const mod = await import(
                pathToFileURL(distPath('plugins.mjs')).href
            )
            expect(typeof mod.errorPlugin).toBe('function')
            expect(typeof mod.tokenPlugin).toBe('function')
        })
    })

    describe('CJS 模块可导入且导出正确', () => {
        const require = createRequire(import.meta.url)

        it('主入口导出 createRequest 和 compose', () => {
            const mod = require(distPath('index.cjs'))
            expect(typeof mod.createRequest).toBe('function')
            expect(typeof mod.compose).toBe('function')
        })

        it('adapters/fetch 导出 fetchAdapter', () => {
            const mod = require(distPath('adapters/fetch.cjs'))
            expect(typeof mod.fetchAdapter).toBe('function')
        })

        it('plugins 导出 errorPlugin 和 tokenPlugin', () => {
            const mod = require(distPath('plugins.cjs'))
            expect(typeof mod.errorPlugin).toBe('function')
            expect(typeof mod.tokenPlugin).toBe('function')
        })
    })

    describe('package.json exports 指向的文件均存在', () => {
        const pkg = JSON.parse(
            readFileSync(resolve(root, 'package.json'), 'utf-8')
        )
        const exports = pkg.exports as Record<
            string,
            Record<string, Record<string, string>>
        >

        for (const [subpath, conditions] of Object.entries(exports)) {
            for (const [condition, mapping] of Object.entries(conditions)) {
                for (const [key, filePath] of Object.entries(mapping)) {
                    it(`${subpath} → ${condition}.${key} (${filePath})`, () => {
                        expect(existsSync(resolve(root, filePath))).toBe(true)
                    })
                }
            }
        }
    })
})
