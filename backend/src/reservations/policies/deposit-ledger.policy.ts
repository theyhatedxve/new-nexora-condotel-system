import { ConflictException } from '@nestjs/common';

export type DepositTotals = {
  COLLECT: number; DEDUCT: number; RETURN: number; RESTORE: number;
};

export function depositBalance(totals: DepositTotals, reservedReturnCentavos: number) {
  const deductedCentavos = totals.DEDUCT - totals.RESTORE;
  const balanceCentavos = totals.COLLECT - deductedCentavos - totals.RETURN;
  const availableCentavos = balanceCentavos - reservedReturnCentavos;
  if (![...Object.values(totals), reservedReturnCentavos, deductedCentavos,
      balanceCentavos, availableCentavos].every((value) => Number.isSafeInteger(value) && value >= 0) ||
      balanceCentavos > 2147483647) {
    throw new ConflictException('Deposit ledger requires review.');
  }
  return {
    collectedCentavos: totals.COLLECT, deductedCentavos,
    returnedCentavos: totals.RETURN, balanceCentavos,
    reservedReturnCentavos, availableCentavos,
  };
}
