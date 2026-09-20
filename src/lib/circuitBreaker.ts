import logger from '@/lib/logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before tripping open (default: 3)
  resetTimeoutMs?: number; // Cooling time in ms before attempting canary probe (default: 60,000ms)
  serviceName?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly serviceName: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 60 * 1000;
    this.serviceName = options.serviceName || 'external-service';
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      logger.info(`Circuit breaker entering HALF_OPEN canary trial for ${this.serviceName}`, {
        module: 'circuit-breaker',
      });
    }
    return this.state;
  }

  public isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  public async execute<T>(
    operation: () => Promise<T>,
    fallback: (reason: string) => Promise<T> | T
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const waitRemainingSec = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
      logger.warn(
        `Circuit breaker is OPEN for ${this.serviceName}. Bypassing external call with immediate fallback.`,
        {
          module: 'circuit-breaker',
          meta: { waitRemainingSec },
        }
      );
      return fallback('Circuit breaker OPEN - service temporarily degraded');
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (err: any) {
      this.recordFailure(err);
      return fallback(`External call failed: ${err?.message || 'unknown error'}`);
    }
  }

  public recordSuccess(): void {
    if (this.state !== 'CLOSED') {
      logger.info(`Circuit breaker for ${this.serviceName} recovered to CLOSED state.`, {
        module: 'circuit-breaker',
      });
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(err?: any): void {
    this.failureCount += 1;
    logger.warn(`Circuit failure registered for ${this.serviceName} (count: ${this.failureCount}/${this.failureThreshold})`, {
      module: 'circuit-breaker',
      error: err,
    });

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
      logger.error(
        `🚨 Circuit breaker TRIPPED to OPEN for ${this.serviceName}. Failures exceeded threshold. Cooling down for ${this.resetTimeoutMs / 1000}s.`,
        {
          module: 'circuit-breaker',
          meta: { nextAttemptIn: `${this.resetTimeoutMs / 1000}s` },
        }
      );
    }
  }
}

// Global singleton for Google Gemini Multimodal / LLM API calls
export const geminiCircuitBreaker = new CircuitBreaker({
  serviceName: 'gemini-ai-models',
  failureThreshold: 3,
  resetTimeoutMs: 60 * 1000,
});

export default geminiCircuitBreaker;
