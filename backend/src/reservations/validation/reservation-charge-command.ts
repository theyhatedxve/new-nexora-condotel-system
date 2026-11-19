import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReservationChargeCommandDto } from '../dto/reservation-charges.dto.js';

export function parseReservationChargeCommand(input: unknown): ReservationChargeCommandDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Invalid charge request.');
  }
  const dto = plainToInstance(ReservationChargeCommandDto, input);
  if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length ||
      Object.values(dto).some((value) => value === null)) {
    throw new BadRequestException('Invalid charge request.');
  }
  const fields: Record<string, string[]> = {
    PROPOSE_DAMAGE: ['description', 'evidenceNotes', 'amountCentavos'],
    PROPOSE_EXTENSION: ['requestedDepartureAt'],
    APPROVE: ['chargeId'], REJECT: ['chargeId', 'reason'],
    COLLECT: ['chargeId', 'moneyReceived'], APPLY_EXTENSION: ['chargeId'],
    REFUND_UNFULFILLED_EXTENSION: ['chargeId', 'moneyReturned', 'reason'],
  };
  const allowed = ['requestId', 'action', ...fields[dto.action]];
  if (Object.entries(dto).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (dto.action === 'PROPOSE_DAMAGE' && (!dto.description || !dto.amountCentavos)) ||
      (dto.action === 'PROPOSE_EXTENSION' && !dto.requestedDepartureAt) ||
      (!dto.action.startsWith('PROPOSE_') && !dto.chargeId) ||
      (['REJECT', 'REFUND_UNFULFILLED_EXTENSION'].includes(dto.action) && !dto.reason) ||
      (dto.action === 'COLLECT' && dto.moneyReceived !== true) ||
      (dto.action === 'REFUND_UNFULFILLED_EXTENSION' && dto.moneyReturned !== true)) {
    throw new BadRequestException('Required action details are missing or inconsistent.');
  }
  dto.requestId = dto.requestId.toLowerCase();
  if (dto.requestedDepartureAt) {
    const at = new Date(dto.requestedDepartureAt);
    if (!Number.isFinite(at.getTime())) throw new BadRequestException('Invalid departure.');
    dto.requestedDepartureAt = at.toISOString();
  }
  return dto;
}
