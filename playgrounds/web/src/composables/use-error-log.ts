import { ref } from 'vue'

import type { LogEntry } from './use-log'

const logs = ref<LogEntry[]>([])

function formatTime(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

/** 全局错误日志，在 errorPlugin 的 onError 中写入，在 ErrorLog 面板中展示 */
export function useErrorLog() {
    function log(content: string) {
        logs.value.push({
            type: 'error',
            content: `[${formatTime()}] ${content}`,
        })
    }

    function clear() {
        logs.value = []
    }

    return { logs, log, clear }
}
