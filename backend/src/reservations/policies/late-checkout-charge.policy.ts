import { BadRequestException } from '@nestjs/common';
import { CHECKOUT_GRACE_MS } from './stay-operations.policy.js';

export function lateCheckoutCharge(
  base: Date, requested: Date, hourlyRateCentavos: number, previouslyBilledHours = 0,
) {
  const totalHours = Math.ceil(Math.max(
    0, requested.getTime() - base.getTime() - CHECKOUT_GRACE_MS,
  ) / 3_600_000);
  const hours = totalHours - previouslyBilledHours;
  const amountCentavos = hours * hourlyRateCentavos;
  if (!Number.isFinite(base.getTime()) || !Number.isFinite(requested.getTime()) ||
      requested <= base || !Number.isSafeInteger(hourlyRateCentavos) ||
      hourlyRateCentavos <= 0 || !Number.isSafeInteger(previouslyBilledHours) ||
      previouslyBilledHours < 0 || !Number.isSafeInteger(hours) || hours < 0 ||
      !Number.isSafeInteger(amountCentavos) || amountCentavos > 2147483647) {
    throw new BadRequestException('Late-checkout pricing requires review.');
  }
  return { billableHours: hours, amountCentavos };
}
