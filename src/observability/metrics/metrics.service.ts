import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();

  increment(metric: string): void {
    const value = this.counters.get(metric) ?? 0;
    this.counters.set(metric, value + 1);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}