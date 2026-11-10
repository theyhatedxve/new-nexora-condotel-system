import { BadRequestException, ConflictException } from '@nestjs/common';

export function normalizeAmenityName(name: string): string {
  const result = name.trim().replace(/\s+/g, ' ');

  if (!result) {
    throw new BadRequestException('Amenity name is required.');
  }

  return result;
}

export function normalizeAmenityDescription(
  description: string | null | undefined,
): string | null {
  return description?.trim() || null;
}

export function handleAmenityDatabaseError(error: unknown): never {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    throw new ConflictException(
      'Amenity or association already exists.',
    );
  }

  throw error;
}
