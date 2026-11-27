import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'internal-chatbot',
      source: 'instrumentation.onRequestError',
      message: e?.message || String(err),
      digest: e?.digest,
      stack: e?.stack,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      timestamp: new Date().toISOString(),
    })
  );
};
