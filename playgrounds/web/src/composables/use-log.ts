import { ref } from 'vue'

import type { Ref } from 'vue'

export interface LogEntry {
    type: 'info' | 'success' | 'error' | 'warn'
    content: string
}

export interface UseLogReturn {
    logs: Ref<LogEntry[]>
    log: (type: LogEntry['type'], content: unknown) => void
    clear: () => void
}

function formatTime(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

/** 提供带时间戳的日志记录能力，驱动 OutputPanel 组件 */
export function useLog(): UseLogReturn {
    const logs = ref<LogEntry[]>([])

    function log(type: LogEntry['type'], content: unknown) {
        const text = typeof content === 'string'
            ? content
            : JSON.stringify(content, null, 2)
        logs.value.push({ type, content: `[${formatTime()}] ${text}` })
    }

    function clear() {
        logs.value = []
    }

    return { logs, log, clear }
}
