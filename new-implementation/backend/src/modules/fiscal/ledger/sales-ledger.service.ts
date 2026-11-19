import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EmissionOutbox } from '../outbox/outbox.entity';
import { LedgerSale } from './ledger-sale.entity';
import { toLedgerEntry } from './sales-ledger.mapper';

export const LEDGER_DISCLAIMER = 'Soporte para revisión del contador. Cifras tomadas de los documentos validados; no constituyen una declaración.';

export class SalesLedgerQueryDto {
  @ApiPropertyOptional({ example: '2026-11-01', description: 'Inclusive, calendar date in Colombia' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @ApiPropertyOptional({ example: '2026-11-30', description: 'Inclusive, calendar date in Colombia' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @ApiPropertyOptional({ enum: ['pos', 'invoice', 'credit_note'] }) @IsOptional() @IsIn(['pos', 'invoice', 'credit_note']) type?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit: number = 100;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

const encode = (e: Pick<LedgerSale, 'issued_at' | 'id'>) => Buffer.from(`${e.issued_at.toISOString()}|${e.id}`).toString('base64url');
function decode(cursor: string): { at: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso);
  if (!id || Number.isNaN(at.getTime())) throw new BadRequestException('Invalid cursor');
  return { at, id };
}

@Injectable()
export class SalesLedgerService {
  constructor(@InjectRepository(LedgerSale) private readonly repo: Repository<LedgerSale>) {}

  /** Records a validated document in the book. Idempotent per outbox row. Call inside the transaction that marks it validated. */
  async record(manager: EntityManager, row: EmissionOutbox, now: Date = new Date()): Promise<void> {
    try {
      await manager.insert(LedgerSale, toLedgerEntry(row, now) as never);
    } catch (e) {
      if ((e as { code?: string }).code !== 'ER_DUP_ENTRY') throw e;
    }
  }

  async list(companyId: string, q: SalesLedgerQueryDto) {
    const base = () => {
      const qb = this.repo.createQueryBuilder('l').where('l.company_id = :companyId', { companyId });
      if (q.from) qb.andWhere('l.issue_date >= :from', { from: q.from });
      if (q.to) qb.andWhere('l.issue_date <= :to', { to: q.to });
      if (q.type) qb.andWhere('l.document_type = :type', { type: q.type });
      return qb;
    };
    const page = base();
    if (q.cursor) {
      const c = decode(q.cursor);
      page.andWhere('(l.issued_at > :at OR (l.issued_at = :at AND l.id > :id))', { at: c.at, id: c.id });
    }
    const rows = await page.orderBy('l.issued_at', 'ASC').addOrderBy('l.id', 'ASC').limit(q.limit + 1).getMany();
    const more = rows.length > q.limit;
    const data = more ? rows.slice(0, q.limit) : rows;

    // Totals over the whole filter, not just this page; credit notes count negative.
    const sums = await base()
      .select('COUNT(*)', 'documents')
      .addSelect('COALESCE(SUM(l.sign * l.base_total), 0)', 'base_total')
      .addSelect('COALESCE(SUM(l.sign * l.tax_total), 0)', 'tax_total')
      .addSelect('COALESCE(SUM(l.sign * l.total), 0)', 'total')
      .getRawOne<{ documents: string; base_total: string; tax_total: string; total: string }>();
    return {
      disclaimer: LEDGER_DISCLAIMER,
      totals: { documents: Number(sums?.documents), base_total: Number(sums?.base_total), tax_total: Number(sums?.tax_total), total: Number(sums?.total) },
      data: data.map(({ created_at: _c, outbox_id: _o, company_id: _co, ...entry }) => entry),
      next_cursor: more ? encode(data[data.length - 1]) : null,
    };
  }
}
