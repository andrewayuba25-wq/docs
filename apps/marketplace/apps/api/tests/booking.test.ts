import { describe, expect, it } from 'vitest';

// Smoke test placeholder. Real tests should boot the API with a test
// database (e.g. via Testcontainers) and exercise the booking state machine.
describe('booking state machine', () => {
  it('allows the documented transitions', () => {
    const allowed: Record<string, string[]> = {
      REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
      EN_ROUTE: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    };
    expect(allowed.REQUESTED).toContain('ACCEPTED');
    expect(allowed.IN_PROGRESS).toContain('COMPLETED');
  });
});
