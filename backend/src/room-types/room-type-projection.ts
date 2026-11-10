export const publicFields = {
  id: true,
  name: true,
  description: true,
  capacity: true,
  baseRateCentavos: true,
} as const;

export const staffFields = {
  ...publicFields,
  isActive: true,
  propertyId: true,
} as const;
