// /home/user/projects/studioxlam/src/utils/wsUtils.ts
import { store } from '../store/store';
import { addLogWithLevel, updateProgress, updateSessionStatus, setGpuStatsReal } from '../store/finetuneSlice';
import { normalizeGpuBundle } from './gpuUtils';
import type { FinetuneSession } from '../types';

/* =======================
   Types
======================= */

export interface WebSocketMessage {
    type: string;
    sessionId?: string;
    message?: string;
    progress?: number;
    status?: string;
    timestamp?: string;
    [key: string]: unknown;
}

/* =======================
   URL helper - ИСПРАВЛЕНО
======================= */

/* export const getWebSocketUrl = (sessionId: string): string => {
    console.group('🔧 getWebSocketUrl');
    
    // 1. Извлекаем чистый ID
    let cleanSessionId = sessionId.trim();
    
    // Если передан полный URL, извлекаем ID из пути
    if (cleanSessionId.includes('://')) {
        try {
            const urlObj = new URL(cleanSessionId);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            cleanSessionId = pathParts[pathParts.length - 1] || sessionId;
        } catch (e) {
            console.error('Error parsing session URL:', e);
        }
    }
    
    // 2. Убираем ТОЛЬКО префикс пути, НЕ удаляем finetune_!
    cleanSessionId = cleanSessionId.replace(/^finetune-ws\//, '');
    
    // 3. УБЕЖДАЕМСЯ, что ID начинается с finetune_ (бэкенд ожидает именно так)
    const finalSessionId = cleanSessionId.startsWith('finetune_')
        ? cleanSessionId
        : `finetune_${cleanSessionId}`;
    
    // 4. Формируем URL WebSocket
    const envWsUrl = import.meta.env.VITE_FINETUNE_WS_URL;
    let finalUrl = '';

    if (envWsUrl?.startsWith('http') || envWsUrl?.startsWith('ws')) {
        // Полный URL из ENV
        const protocol = envWsUrl.startsWith('https') || envWsUrl.startsWith('wss') ? 'wss:' : 'ws:';
        const urlBody = envWsUrl.replace(/^(https?:|wss?:)\/\//, '');
        finalUrl = `${protocol}//${urlBody}/${finalSessionId}`;
    } else if (envWsUrl) {
        // Относительный путь (работа через прокси)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const path = envWsUrl.startsWith('/') ? envWsUrl : `/${envWsUrl}`;
        finalUrl = `${protocol}//${host}${path}/${finalSessionId}`;
    } else {
        // Фолбэк: прямой WebSocket порт
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = '3003'; // WebSocket порт бэкенда
        finalUrl = `${protocol}//${host}:${port}/${finalSessionId}`;
    }
    
    console.log('📋 Session ID (raw):', sessionId);
    console.log('📋 Session ID (final):', finalSessionId);
    console.log('🔗 WebSocket URL:', finalUrl);
    console.groupEnd();
    
    return finalUrl;
}; */

export const getWebSocketUrl = (sessionId: string): string => {
  console.group('🔧 getWebSocketUrl');
  
  // ✅ Всегда через фронтенд домен, НЕ lm.almaz-t.ru
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // studioxlam.almaz-t.ru
  
  // ✅ Правильный путь: /finetune-ws/ с префиксом
  const finalSessionId = sessionId.startsWith('finetune_') 
    ? sessionId 
    : `finetune_${sessionId}`;
  
  const finalUrl = `${protocol}//${host}/finetune-ws/${finalSessionId}`;
  
  console.log('✅ WebSocket URL:', finalUrl);
  console.groupEnd();
  
  return finalUrl;
};

const SESSION_STATUSES: FinetuneSession['status'][] = [
  'running',
  'completed',
  'failed',
  'stopped',
  'pending',
  'unknown',
];

function asFinetuneSessionStatus(value: unknown): FinetuneSession['status'] {
  if (typeof value === 'string' && (SESSION_STATUSES as string[]).includes(value)) {
    return value as FinetuneSession['status'];
  }
  if (value === 'training' || value === 'in_progress') return 'running';
  if (value === 'success' || value === 'done') return 'completed';
  if (value === 'error') return 'failed';
  if (value === 'cancelled' || value === 'canceled') return 'stopped';
  return 'unknown';
}

/* =======================
   Main WS factory - ИСПРАВЛЕНО
======================= */

export function createFinetuneWebSocket(
    sessionId: string,
    onMessage: (data: WebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void,
    onOpen?: () => void
): WebSocket {
    // ВАЖНО: Всегда используем полный ID с префиксом finetune_
    const finalSessionId = sessionId.startsWith('finetune_')
        ? sessionId
        : `finetune_${sessionId}`;
    
    const url = getWebSocketUrl(finalSessionId);
    console.log(`🔌 WebSocket connecting: ${url}`);

    const ws = new WebSocket(url);
    let heartbeat: WebSocketHeartbeat | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    ws.onopen = () => {
        console.log(`✅ WebSocket connected: ${finalSessionId}`);
        reconnectAttempts = 0;
        
        // Инициализируем heartbeat
        heartbeat = new WebSocketHeartbeat(ws);
        heartbeat.start();
        
        // Отправляем ping сразу после подключения
        safeSend(ws, {
            type: 'ping',
            sessionId: finalSessionId,
            timestamp: Date.now(),
        });

        // Запрашиваем статус сессии
        safeSend(ws, {
            type: 'get_status',
            sessionId: finalSessionId,
            timestamp: Date.now(),
        });

        onOpen?.();
    };

    ws.onmessage = (event) => {
        const data = parseMessage(event.data);

        if (!data) {
            return;
        }

        // ---- heartbeat handling ----
        if (heartbeat) {
            heartbeat.handleMessage(data);
        }

        // ---- internal log handling ----
        if (data.type === 'log' && data.message) {
            const level = getLogLevelFromMessage(data.message);
            store.dispatch(addLogWithLevel({ 
                message: data.message, 
                level 
            }));
        }

        if (data.type === 'error' && data.message) {
            store.dispatch(
                addLogWithLevel({
                    message: `❌ ${data.message}`,
                    level: 'error',
                })
            );
        }

        // ---- session initialization ----
        if (data.type === 'session_init') {
            console.log('📦 Session initialized:', data);
            
            // Обновляем прогресс в store если есть
            if (data.progress !== undefined) {
                store.dispatch({
                    type: 'finetune/updateProgress',
                    payload: data.progress
                });
            }
        }

        if (data.type === 'session_not_found') {
            console.warn('⚠️ Session not found:', data);
            
            // Пытаемся переподключиться с правильным ID
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                
                setTimeout(() => {
                    ws.close();
                    createFinetuneWebSocket(
                        finalSessionId,
                        onMessage,
                        onError,
                        onClose,
                        onOpen
                    );
                }, 2000 * reconnectAttempts);
            }
        }

        // ---- status updates ----
        if (data.type === 'status_update' || data.type === 'status') {
            console.log(`📊 Status update: ${data.status}, progress: ${data.progress}%`);
            
            if (typeof data.progress === 'number') {
                store.dispatch(updateProgress(data.progress));
            }
            
            if (data.status) {
                store.dispatch(updateSessionStatus({
                    status: asFinetuneSessionStatus(data.status),
                    progress: typeof data.progress === 'number' ? data.progress : undefined,
                }));
            }
        }

        // ---- gpu stats ----
        if (data.type === 'gpu_stats' && data.gpuStats) {
            store.dispatch(setGpuStatsReal(normalizeGpuBundle(data.gpuStats as Record<string, unknown>)));
        }

        // ---- heartbeat response ----
        if (data.type === 'pong') {
            console.debug('💓 Heartbeat received');
        }

        // ---- external callback ----
        onMessage(data);
    };

    ws.onerror = (event) => {
        console.error('❌ WebSocket error', event);
        
        store.dispatch(
            addLogWithLevel({
                message: '❌ WebSocket connection error',
                level: 'error',
            })
        );
        
        onError?.(event);
    };

    ws.onclose = (event) => {
        console.log('🔌 WebSocket closed', {
            code: event.code,
            reason: event.reason || 'No reason',
            clean: event.wasClean,
            sessionId: finalSessionId
        });

        // Останавливаем heartbeat
        if (heartbeat) {
            heartbeat.stop();
            heartbeat = null;
        }

        // Логируем неожиданные закрытия
        if (event.code !== 1000 && event.code !== 1001) {
            console.warn(`⚠️ WebSocket closed unexpectedly: code ${event.code}`);
            
            store.dispatch(
                addLogWithLevel({
                    message: `⚠️ Connection closed (code: ${event.code})`,
                    level: 'warning',
                })
            );
        }

        onClose?.(event);
    };

    return ws;
}

/* =======================
   Heartbeat - УЛУЧШЕНО
======================= */

export class WebSocketHeartbeat {
    private ws: WebSocket;
    private pingIntervalId: number | null = null;
    private timeoutIntervalId: number | null = null;
    private lastPongTime: number = Date.now();
    private isActive: boolean = false;

    constructor(ws: WebSocket) {
        this.ws = ws;
    }

    handleMessage(data: WebSocketMessage) {
        if (data.type === 'pong') {
            this.lastPongTime = Date.now();
            this.isActive = true;
            console.debug('💓 Pong received');
        }
    }

    start(pingIntervalMs = 25000, timeoutMs = 10000) {
        this.stop();
        this.lastPongTime = Date.now();
        this.isActive = true;

        // Отправляем ping каждые 25 секунд
        this.pingIntervalId = window.setInterval(() => {
            if (this.ws.readyState !== WebSocket.OPEN) {
                return;
            }

            safeSend(this.ws, {
                type: 'ping',
                timestamp: Date.now(),
            });
            
            console.debug('💓 Ping sent');
        }, pingIntervalMs);

        // Проверяем таймаут каждые 5 секунд
        this.timeoutIntervalId = window.setInterval(() => {
            if (!this.isActive || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }

            const timeSinceLastPong = Date.now() - this.lastPongTime;
            
            if (timeSinceLastPong > timeoutMs * 2) {
                console.warn('⚠️ WebSocket heartbeat timeout - no pong received');
                this.isActive = false;
                
                // Пробуем переподключиться
                try {
                    this.ws.close(4000, 'Heartbeat timeout');
                } catch (e) {
                    console.error('Error closing websocket:', e);
                }
            }
        }, 5000);
    }

    stop() {
        if (this.pingIntervalId !== null) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
        
        if (this.timeoutIntervalId !== null) {
            clearInterval(this.timeoutIntervalId);
            this.timeoutIntervalId = null;
        }
        
        this.isActive = false;
    }

    isConnected(): boolean {
        return this.isActive && this.ws.readyState === WebSocket.OPEN;
    }
}

/* =======================
   Test utility
======================= */

export const testWebSocketConnection = (sessionId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        let resolved = false;
        let ws: WebSocket | null = null;

        const safeResolve = (value: boolean) => {
            if (!resolved) {
                resolved = true;
                resolve(value);
            }
        };

        const finalSessionId = sessionId.startsWith('finetune_')
            ? sessionId
            : `finetune_${sessionId}`;

        ws = createFinetuneWebSocket(
            finalSessionId,
            (data) => {
                if (data.type === 'session_init' || data.type === 'pong') {
                    console.log('✅ WebSocket test successful');
                    ws?.close();
                    safeResolve(true);
                }
            },
            (error) => {
                console.error('❌ WebSocket test failed:', error);
                ws?.close();
                safeResolve(false);
            },
            (event) => {
                console.log('WebSocket test closed:', event.code);
                safeResolve(event.code === 1000);
            }
        );

        // Таймаут теста
        setTimeout(() => {
            if (ws?.readyState !== WebSocket.OPEN) {
                ws?.close();
                safeResolve(false);
            }
        }, 5000);
    });
};

/* =======================
   Helpers
======================= */

function safeSend(ws: WebSocket, payload: object) {
    if (ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify(payload));
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
        }
    }
}

function parseMessage(raw: unknown): WebSocketMessage | null {
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {
                type: 'raw_message',
                message: raw,
                timestamp: new Date().toISOString(),
            };
        }
    }

    return {
        type: 'binary_message',
        data: raw,
        timestamp: new Date().toISOString(),
    };
}

function getLogLevelFromMessage(
    message: string
): 'debug' | 'info' | 'warning' | 'error' {
    const msg = message.toLowerCase();

    if (
        msg.includes('error') ||
        msg.includes('failed') ||
        msg.includes('exception') ||
        msg.includes('traceback')
    ) {
        return 'error';
    }
    if (msg.includes('warn') || msg.includes('⚠')) {
        return 'warning';
    }
    if (msg.includes('debug') || msg.includes('🔍')) {
        return 'debug';
    }
    return 'info';
}

/* =======================
   Cleanup utility
======================= */

export const closeAllWebSockets = () => {
    // Эта функция должна вызываться при размонтировании компонента
    // или при выходе из приложения
    console.log('🔌 Closing all WebSocket connections');
    
    // В браузере нет прямого доступа ко всем WebSocket,
    // но мы можем сохранять активные соединения в store
    // Это пример - добавьте свою логику
};

export default getWebSocketUrl;