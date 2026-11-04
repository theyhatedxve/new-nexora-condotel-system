import {
  BadRequestException,
} from '@nestjs/common';

import {
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import type {
  GuestPaymentMethod,
} from './dto/create-guest-booking.dto.js';

export const GUEST_BOOKING_POLICY_VERSION =
  'guest-booking-v2';

export const ARRIVAL_GRACE_MS =
  30 * 60 * 1000;

export const GUEST_RESPONSE_WINDOW_MS =
  24 * 60 * 60 * 1000;

export type PropertyDeadlineReason =
  | 'ARRIVAL_GRACE_EXPIRED'
  | 'GUEST_RESPONSE_EXPIRED';

function validInstant(
  value: Date,
  message: string,
): number {
  if (
    !(value instanceof Date) ||
    !Number.isFinite(value.getTime())
  ) {
    throw new BadRequestException(message);
  }

  return value.getTime();
}

function addMilliseconds(
  value: Date,
  milliseconds: number,
): Date {
  const result = new Date(
    validInstant(value, 'Invalid timestamp.') +
      milliseconds,
  );

  validInstant(result, 'Invalid deadline.');

  return result;
}

export function expectedGuestArrival(
  checkIn: string,
  arrivalTime: string,
  now: Date,
): Date {
  parsePhilippineDate(checkIn);

  if (
    typeof arrivalTime !== 'string' ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      arrivalTime,
    )
  ) {
    throw new BadRequestException(
      'Arrival time must use HH:mm format.',
    );
  }

  const arrival = new Date(
    `${checkIn}T${arrivalTime}:00+08:00`,
  );

  const arrivalMilliseconds = validInstant(
    arrival,
    'Invalid expected arrival time.',
  );

  const nowMilliseconds = validInstant(
    now,
    'Invalid current time.',
  );

  if (arrivalMilliseconds <= nowMilliseconds) {
    throw new BadRequestException(
      'Expected arrival must be in the future.',
    );
  }

  return arrival;
}

export function payAtPropertyDeadlines(
  expectedArrivalAt: Date,
  firstContactedAt: Date | null,
): {
  responseDeadlineAt: Date | null;
  holdExpiresAt: Date;
  cancellationReason: PropertyDeadlineReason;
} {
  const arrivalDeadline = addMilliseconds(
    expectedArrivalAt,
    ARRIVAL_GRACE_MS,
  );

  if (firstContactedAt === null) {
    return {
      responseDeadlineAt: null,
      holdExpiresAt: arrivalDeadline,
      cancellationReason:
        'ARRIVAL_GRACE_EXPIRED',
    };
  }

  const responseDeadline = addMilliseconds(
    firstContactedAt,
    GUEST_RESPONSE_WINDOW_MS,
  );

  if (arrivalDeadline <= responseDeadline) {
    return {
      responseDeadlineAt: responseDeadline,
      holdExpiresAt: arrivalDeadline,
      cancellationReason:
        'ARRIVAL_GRACE_EXPIRED',
    };
  }

  return {
    responseDeadlineAt: responseDeadline,
    holdExpiresAt: responseDeadline,
    cancellationReason:
      'GUEST_RESPONSE_EXPIRED',
  };
}

export function initialGuestBookingTiming(
  input: {
    checkIn: string;
    arrivalTime: string;
    paymentPreference: GuestPaymentMethod;
  },
  now: Date,
  onlineHoldMilliseconds: number,
) {
  if (
    input.paymentPreference !==
      'PAY_AT_PROPERTY' &&
    input.paymentPreference !== 'PAYMONGO'
  ) {
    throw new BadRequestException(
      'Choose a supported payment method.',
    );
  }

  const expectedArrivalAt =
    expectedGuestArrival(
      input.checkIn,
      input.arrivalTime,
      now,
    );

  if (
    input.paymentPreference ===
    'PAY_AT_PROPERTY'
  ) {
    const deadlines = payAtPropertyDeadlines(
      expectedArrivalAt,
      null,
    );

    return {
      bookingPolicyVersion:
        GUEST_BOOKING_POLICY_VERSION,
      expectedArrivalAt,
      holdExpiresAt:
        deadlines.holdExpiresAt,
    };
  }

  if (
    !Number.isSafeInteger(
      onlineHoldMilliseconds,
    ) ||
    onlineHoldMilliseconds <= 0
  ) {
    throw new BadRequestException(
      'Invalid online hold duration.',
    );
  }

  return {
    bookingPolicyVersion:
      GUEST_BOOKING_POLICY_VERSION,
    expectedArrivalAt,
    holdExpiresAt: addMilliseconds(
      now,
      onlineHoldMilliseconds,
    ),
  };
}

export function bookingDeadlineReached(
  deadline: Date,
  now: Date,
): boolean {
  return (
    validInstant(now, 'Invalid current time.') >=
    validInstant(deadline, 'Invalid deadline.')
  );
}