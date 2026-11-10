import { BadRequestException, ConflictException } from '@nestjs/common';

export function normalizeRoomNumber(value: string): string {
  const roomNumber = value.trim();

  if (!roomNumber) {
    throw new BadRequestException(
      'Room number is required.',
    );
  }

  return roomNumber;
}

export function normalizeRoomFloor(
  value: string | null | undefined,
): string | null {
  return value?.trim() || null;
}

export function handleRoomDatabaseError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    throw new ConflictException(
      'Room number already exists.',
    );
  }

  throw error;
}
