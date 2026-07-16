/** Minimal structured logger interface — injected into CheckoutOrchestrator. */
export interface Logger {
  info(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

/** Production logger — writes to stdout/stderr. */
export class ConsoleLogger implements Logger {
  info(message: string, data?: unknown): void {
    console.log(`[INFO]  ${message}`, data ?? '');
  }
  error(message: string, data?: unknown): void {
    console.error(`[ERROR] ${message}`, data ?? '');
  }
  warn(message: string, data?: unknown): void {
    console.warn(`[WARN]  ${message}`, data ?? '');
  }
}

/**
 * Silent logger for unit tests.
 * Pass this instead of ConsoleLogger to keep test output clean.
 */
export class NoOpLogger implements Logger {
  info(): void  {}
  error(): void {}
  warn(): void  {}
}
