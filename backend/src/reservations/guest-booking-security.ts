import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

import {
  BadRequestException,
} from '@nestjs/common';

import {
  plainToInstance,
} from 'class-transformer';

import {
  isUUID,
  validateSync,
} from 'class-validator';

import {
  CreateGuestBookingDto,
} from './dto/create-guest-booking.dto.js';

import {
  hash,
  validToken,
} from './reservation-crypto.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
} from './guest-booking-policy.js';

export function guestBookingCredentials(
  requestId: unknown,
  recoveryToken: unknown,
) {
  if (
    typeof requestId !== 'string' ||
    !isUUID(requestId, '4') ||
    !validToken(recoveryToken)
  ) {
    throw new BadRequestException(
      'Invalid booking request credentials.',
    );
  }

  return {
    requestId: requestId.toLowerCase(),
    recoveryTokenHash: hash(recoveryToken),
  };
}

export function equalGuestDigests(
  first: unknown,
  second: unknown,
): boolean {
  if (
    !validToken(first) ||
    !validToken(second)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(first, 'hex'),
    Buffer.from(second, 'hex'),
  );
}

export function normalizedGuestBooking(
  input: unknown,
): CreateGuestBookingDto & { arrivalTime: string } {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new BadRequestException(
      'Invalid booking details.',
    );
  }

  const dto = plainToInstance(
    CreateGuestBookingDto,
    input,
  );

  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (
    errors.length > 0 ||
    typeof dto.arrivalTime !== 'string' ||
    !dto.firstName.trim() ||
    !dto.lastName.trim() ||
    !dto.roomTypeId.trim()
  ) {
    throw new BadRequestException(
      'Invalid booking details.',
    );
  }

  dto.requestId = dto.requestId.toLowerCase();
  dto.roomTypeId = dto.roomTypeId.trim();
  dto.firstName = dto.firstName.trim();
  dto.lastName = dto.lastName.trim();
  dto.email = dto.email.trim().toLowerCase();
  dto.phone = dto.phone?.trim() || undefined;

    return {
    requestId: dto.requestId,
    recoveryToken: dto.recoveryToken,
    roomTypeId: dto.roomTypeId,
    checkIn: dto.checkIn,
    checkOut: dto.checkOut,
    guests: dto.guests,
    rentalType: dto.rentalType,
    rentalUnits: dto.rentalUnits,
    arrivalTime: dto.arrivalTime,
    paymentPreference: dto.paymentPreference,
    acknowledgmentAccepted: dto.acknowledgmentAccepted,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
  };
}

export function guestBookingFingerprint(
  input: CreateGuestBookingDto,
): string {
  const payload = {
    policyVersion:
      GUEST_BOOKING_POLICY_VERSION,
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    arrivalTime: input.arrivalTime,
    paymentPreference:
      input.paymentPreference,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone ?? null,
    acknowledgmentAccepted:
      input.acknowledgmentAccepted,
    ...(input.rentalType === undefined ? {} : {
      rentalType: input.rentalType,
      rentalUnits: input.rentalUnits,
    }),
  };

  return createHmac(
    'sha256',
    Buffer.from(
      input.recoveryToken,
      'hex',
    ),
  )
    .update(
      JSON.stringify(payload),
      'utf8',
    )
    .digest('hex');
}
