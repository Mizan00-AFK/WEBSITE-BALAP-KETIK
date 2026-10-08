/**
 * Tiny fixed-window rate limiter (one instance per socket).
 */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  allow(key: string, limit: number, windowMs = 1000): boolean {
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || now - current.start >= windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }
}
