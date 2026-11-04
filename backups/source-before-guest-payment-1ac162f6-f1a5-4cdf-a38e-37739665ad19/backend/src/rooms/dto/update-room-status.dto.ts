
import { IsIn } from 'class-validator';

export const MANUAL_ROOM_STATUSES = [
  'READY',
  'CLEANING',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
] as const;

export type ManualRoomStatus =
  (typeof MANUAL_ROOM_STATUSES)[number];

export class UpdateRoomStatusDto {
  @IsIn(MANUAL_ROOM_STATUSES)
  status!: ManualRoomStatus;
}
