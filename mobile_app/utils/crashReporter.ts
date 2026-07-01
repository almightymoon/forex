import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch, buildUrl } from './api';

const STORAGE_KEY = 'mobile_crash_logs_v1';
const MAX_STORED = 50;
const FLUSH_BATCH = 10;

export type CrashLogType =
  | 'js_error'
  | 'unhandled_rejection'
  | 'error_boundary'
  | 'manual';

export type CrashLogEntry = {
  id: string;
  at: string;
  type: CrashLogType;
  message: string;
  stack?: string;
  componentStack?: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
  buildVersion?: string;
  deviceName?: string;
  screen?: string;
};

function deviceMeta() {
  return {
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    buildVersion:
      Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode?.toString(),
    deviceName: Constants.deviceName ?? undefined,
  };
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeError(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return { message: reason.message || reason.name, stack: reason.stack };
  }
  if (typeof reason === 'string') return { message: reason };
  try {
    return { message: JSON.stringify(reason) };
  } catch {
    return { message: String(reason) };
  }
}

async function readStoredLogs(): Promise<CrashLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CrashLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStoredLogs(entries: CrashLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
  } catch {
    /* ignore */
  }
}

export async function getCrashLogs(): Promise<CrashLogEntry[]> {
  return readStoredLogs();
}

export async function clearCrashLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function recordCrashLog(
  type: CrashLogType,
  reason: unknown,
  extra?: { componentStack?: string; screen?: string },
): Promise<void> {
  const { message, stack } = normalizeError(reason);
  const entry: CrashLogEntry = {
    id: makeId(),
    at: new Date().toISOString(),
    type,
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 8000),
    componentStack: extra?.componentStack?.slice(0, 4000),
    screen: extra?.screen,
    ...deviceMeta(),
  };

  const logs = await readStoredLogs();
  logs.unshift(entry);
  await writeStoredLogs(logs);

  void flushCrashLogsToServer();
}

async function postLogs(entries: CrashLogEntry[]): Promise<boolean> {
  try {
    const res = await apiFetch('api/mobile/crash-reports', {
      method: 'POST',
      body: JSON.stringify({ reports: entries }),
    });
    return res.ok;
  } catch {
    try {
      const res = await fetch(buildUrl('mobile/crash-reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: entries }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export async function flushCrashLogsToServer(): Promise<number> {
  const logs = await readStoredLogs();
  if (logs.length === 0) return 0;

  const batch = logs.slice(0, FLUSH_BATCH);
  const ok = await postLogs(batch);
  if (!ok) return 0;

  await writeStoredLogs(logs.slice(batch.length));
  return batch.length;
}

export function installCrashHandlers(): void {
  const errorUtils = (global as { ErrorUtils?: { getGlobalHandler?: () => (e: Error, isFatal?: boolean) => void; setGlobalHandler?: (h: (e: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const defaultHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    void recordCrashLog('js_error', error, {
      screen: isFatal ? 'fatal' : 'non-fatal',
    });
    defaultHandler?.(error, isFatal);
  });
}
