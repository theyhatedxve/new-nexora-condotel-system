export const imageFields = {
  id: true,
  roomTypeId: true,
  filePath: true,
  altText: true,
  displayOrder: true,
  isPrimary: true,
  createdAt: true,
} as const;

export type ImageRecord = {
  id: string;
  roomTypeId: string;
  filePath: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
};

export function publicRoomImage(image: ImageRecord) {
  return {
    id: image.id,
    roomTypeId: image.roomTypeId,
    altText: image.altText,
    displayOrder: image.displayOrder,
    isPrimary: image.isPrimary,
    url: `/api/room-images/${image.id}/file`,
  };
}
