import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReservationDepositCommandDto } from '../dto/reservation-deposits.dto.js';

export function parseReservationDepositCommand(input: unknown): ReservationDepositCommandDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Invalid deposit request.');
  }
  const dto = plainToInstance(ReservationDepositCommandDto, input);
  if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length ||
      Object.values(dto).some((value) => value === null)) {
    throw new BadRequestException('Invalid deposit request.');
  }
  const extra: Record<string, string[]> = {
    COLLECT: ['amountCentavos', 'moneyReceived'], DEDUCT: ['chargeId'],
    AUTHORIZE_RETURN: ['amountCentavos'],
    RETURN_CASH: ['authorizationId', 'moneyReturned'], RESTORE_EXTENSION: ['chargeId'],
  };
  const allowed = ['requestId', 'action', 'reason', ...extra[dto.action]];
  if (Object.entries(dto).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (['COLLECT', 'AUTHORIZE_RETURN'].includes(dto.action) && !dto.amountCentavos) ||
      (['DEDUCT', 'RESTORE_EXTENSION'].includes(dto.action) && !dto.chargeId) ||
      (dto.action === 'COLLECT' && dto.moneyReceived !== true) ||
      (dto.action === 'RETURN_CASH' && (!dto.authorizationId || dto.moneyReturned !== true))) {
    throw new BadRequestException('Required deposit details are missing.');
  }
  dto.requestId = dto.requestId.toLowerCase();
  return dto;
}
