import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CollectionsReportQueryDto } from './collections-report-query.dto.js';

export class DepositReportQueryDto extends CollectionsReportQueryDto {
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') return value;
    return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}
