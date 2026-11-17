import { describe, expect, it } from 'vitest';
import { depositBalance } from './deposit-ledger.policy.js';

describe('deposit movement accounting', () => {
  it('separates deductions, cash returns and reserved returns', () => {
    expect(depositBalance({ COLLECT: 100000, DEDUCT: 40000, RESTORE: 0, RETURN: 10000 }, 30000)).toEqual({
      collectedCentavos: 100000, deductedCentavos: 40000, returnedCentavos: 10000,
      balanceCentavos: 50000, reservedReturnCentavos: 30000, availableCentavos: 20000,
    });
  });
  it('restores a deduction without inventing cash received', () => {
    expect(depositBalance({ COLLECT: 100000, DEDUCT: 40000, RESTORE: 40000, RETURN: 0 }, 0))
      .toMatchObject({ collectedCentavos: 100000, deductedCentavos: 0, balanceCentavos: 100000 });
  });
  it('rejects negative balances and double-spent return reservations', () => {
    expect(() => depositBalance({ COLLECT: 10000, DEDUCT: 20000, RESTORE: 0, RETURN: 0 }, 0)).toThrow();
    expect(() => depositBalance({ COLLECT: 10000, DEDUCT: 0, RESTORE: 0, RETURN: 0 }, 20000)).toThrow();
  });
});
