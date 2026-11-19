import type { Reservation } from '../../generated/prisma/client.js';

type StayClock = Pick<Reservation,
  'status' | 'rentalType' | 'inventoryStartAt' | 'inventoryEndAt' |
  'scheduledArrivalAt' | 'scheduledDepartureAt' | 'actualArrivalAt' |
  'actualDepartureAt'
>;
export const CHECKOUT_GRACE_MS = 30 * 60_000;

export function checkoutGuidance(
  booking: StayClock, now = new Date(),
  billing?: { baseDepartureAt: Date; paidHours: number },
) {
  const valid = (date: Date | null): date is Date =>
    date instanceof Date && Number.isFinite(date.getTime());
  const precise = Boolean(
    booking.rentalType && valid(booking.inventoryStartAt) &&
    valid(booking.inventoryEndAt) && valid(booking.scheduledArrivalAt) &&
    valid(booking.scheduledDepartureAt) &&
    booking.inventoryStartAt! < booking.inventoryEndAt! &&
    (booking.status !== 'CHECKED_IN' || valid(booking.actualArrivalAt)),
  );
  const departure = precise ? booking.inventoryEndAt : null;
  const base = departure && (!billing ||
    (valid(billing.baseDepartureAt) && Number.isSafeInteger(billing.paidHours) && billing.paidHours >= 0))
    ? billing?.baseDepartureAt ?? departure : null;
  const grace = base ? new Date(base.getTime() + CHECKOUT_GRACE_MS) : null;
  const coverage = grace && billing
    ? new Date(grace.getTime() + billing.paidHours * 3_600_000) : null;
  const phase = booking.status === 'CHECKED_OUT' ? 'CHECKED_OUT'
    : booking.status !== 'CHECKED_IN' ? 'NOT_CHECKED_IN'
    : !departure || !grace || !valid(grace) ? 'TIMING_REVIEW'
    : now < departure ? 'BEFORE_DEPARTURE'
    : now <= grace ? 'WITHIN_GRACE' : 'PAST_GRACE';
  return {
    effectiveDepartureAt: departure,
    graceEndsAt: grace && valid(grace) ? grace : null,
    paidBillingThroughAt: coverage && valid(coverage) ? coverage : null,
    actualArrivalAt: booking.actualArrivalAt,
    actualDepartureAt: booking.actualDepartureAt,
    phase,
  };
}
