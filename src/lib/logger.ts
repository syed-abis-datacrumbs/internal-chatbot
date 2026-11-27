export interface LogContext {
  service?: string;
  route?: string;
  method?: string;
  provider?: string;
  model?: string;
  status?: number | string;
  [key: string]: unknown;
}

export function logError(message: string, err?: unknown, context: LogContext = {}): void {
  const errMessage = err instanceof Error ? err.message : err !== undefined ? String(err) : undefined;
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      level: 'error',
      service: context.service || 'internal-chatbot',
      message,
      ...(errMessage ? { error: errMessage } : {}),
      ...(stack ? { stack } : {}),
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}
