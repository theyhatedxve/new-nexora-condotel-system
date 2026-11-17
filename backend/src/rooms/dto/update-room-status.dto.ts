
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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

  @IsOptional()
  @IsIn([...MANUAL_ROOM_STATUSES, 'OCCUPIED'])
  expectedStatus?: string;
}

export class RoomStatusHistoryQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page: number = 1;
}
