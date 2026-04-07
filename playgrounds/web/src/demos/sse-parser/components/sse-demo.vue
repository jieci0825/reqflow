<script setup lang="ts">
import { parseEventStream, parseJSONStream } from 'reqflow/sse'
import { ref } from 'vue'

import DemoCard from '@/components/demo-card.vue'
import OutputPanel from '@/components/output-panel.vue'
import { useLog } from '@/composables/use-log'

import type { SSEEvent } from 'reqflow/sse'

const messageCount = ref(6)
const interval = ref(300)
const { logs, log, clear } = useLog()
const streaming = ref(false)
let abortController: AbortController | null = null

async function startEventStream() {
    clear()
    streaming.value = true
    abortController = new AbortController()

    const count = messageCount.value || 6
    const ms = interval.value || 300

    log('info', `→ 发起 event-stream 请求（${count} 条，间隔 ${ms}ms）`)

    try {
        const res = await fetch(`/api/sse/event-stream?count=${count}&interval=${ms}`, {
            signal: abortController.signal,
        })

        if (!res.body) {
            log('error', '响应无 body，无法解析流')
            return
        }

        log('success', '连接已建立，开始接收事件...')

        await parseEventStream(res.body, {
            onEvent(event: SSEEvent) {
                if (event.event === 'done') {
                    log('info', `[done] ${event.data}`)
                } else if (event.event === 'progress') {
                    log('warn', `[${event.event}] ${event.data}${event.id ? ` (id=${event.id})` : ''}`)
                } else {
                    log('success', `[${event.event}] ${event.data}${event.id ? ` (id=${event.id})` : ''}${event.retry ? ` (retry=${event.retry})` : ''}`)
                }
            },
            onError(error: Error) {
                log('error', `解析错误: ${error.message}`)
            },
        })

        log('info', '流已结束')
    } catch (err: any) {
        if (err.name === 'AbortError') {
            log('warn', '请求已被手动中止')
        } else {
            log('error', `请求异常: ${err.message}`)
        }
    } finally {
        streaming.value = false
        abortController = null
    }
}

async function startJSONStream() {
    clear()
    streaming.value = true
    abortController = new AbortController()

    const count = messageCount.value || 6
    const ms = interval.value || 300

    log('info', `→ 发起 json-stream 请求（${count} 条，间隔 ${ms}ms）`)

    try {
        const res = await fetch(`/api/sse/json-stream?count=${count}&interval=${ms}`, {
            signal: abortController.signal,
        })

        if (!res.body) {
            log('error', '响应无 body，无法解析流')
            return
        }

        log('success', '连接已建立，开始接收 NDJSON...')

        await parseJSONStream(res.body, {
            onJSON(data: any) {
                log('success', `← ${JSON.stringify(data)}`)
            },
            onError(error: Error) {
                log('error', `JSON 解析错误: ${error.message}`)
            },
        })

        log('info', '流已结束')
    } catch (err: any) {
        if (err.name === 'AbortError') {
            log('warn', '请求已被手动中止')
        } else {
            log('error', `请求异常: ${err.message}`)
        }
    } finally {
        streaming.value = false
        abortController = null
    }
}

function abort() {
    abortController?.abort()
}
</script>

<template>
    <DemoCard
        title="SSE 解析器演示"
        badge="SSE"
        badge-color="green"
        :border-color="'rgba(74, 222, 128, 0.3)'"
    >
        <template #default>
            <p class="desc">
                使用 <code>parseEventStream</code> 和 <code>parseJSONStream</code>
                解析服务端推送的流式数据，支持标准 SSE 协议和 NDJSON 两种格式
            </p>
            <div class="form-row">
                <label>
                    消息数量：
                    <input
                        v-model.number="messageCount"
                        type="number"
                        min="1"
                        max="50"
                        :disabled="streaming"
                    />
                </label>
                <label>
                    推送间隔(ms)：
                    <input
                        v-model.number="interval"
                        type="number"
                        min="50"
                        max="5000"
                        :disabled="streaming"
                    />
                </label>
            </div>
            <div class="btn-group">
                <button
                    :disabled="streaming"
                    @click="startEventStream"
                >
                    Event-Stream 格式
                </button>
                <button
                    :disabled="streaming"
                    @click="startJSONStream"
                >
                    NDJSON 格式
                </button>
                <button
                    :disabled="!streaming"
                    class="btn-abort"
                    @click="abort"
                >
                    中止连接
                </button>
            </div>
            <OutputPanel :logs="logs" />
        </template>
    </DemoCard>
</template>

<style scoped lang="scss">
.desc {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
}

.form-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;

    label {
        font-size: 0.85rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
}

.btn-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.btn-abort {
    background: rgba(248, 113, 113, 0.15);
    color: var(--red);
    border-color: rgba(248, 113, 113, 0.3);

    &:hover:not(:disabled) {
        background: rgba(248, 113, 113, 0.25);
    }
}
</style>
