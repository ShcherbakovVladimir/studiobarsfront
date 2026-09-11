// /home/user/projects/studioxlam/src/utils/logging.ts
import { store } from '../store/store';
import { addLogWithLevel } from '../store/finetuneSlice';

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

const dispatchLog = (level: LogLevel, message: string, emoji?: string) => {
  const formattedMessage = emoji ? `${emoji} ${message}` : message;
  store.dispatch(addLogWithLevel({ message: formattedMessage, level }));
};

export const logDebug = (message: string) => dispatchLog('debug', message);
export const logInfo = (message: string) => dispatchLog('info', message);
export const logSuccess = (message: string) => dispatchLog('info', `✅ ${message}`);
export const logWarning = (message: string) => dispatchLog('warning', `⚠️ ${message}`);
export const logError = (message: string) => dispatchLog('error', `❌ ${message}`);