import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertFiscalProfileDto } from './dto/fiscal-profile.dto';
import { FiscalProfile } from './entities/fiscal-profile.entity';
import { calculateDv, splitNit } from './nit';

@Injectable()
export class FiscalProfileService {
  constructor(@InjectRepository(FiscalProfile) private readonly repo: Repository<FiscalProfile>) {}

  async get(issuerId: string): Promise<FiscalProfile> {
    const row = await this.repo.findOneBy({ company_id: issuerId });
    if (!row) throw new NotFoundException('Fiscal profile not set');
    return row;
  }

  async upsert(issuerId: string, dto: UpsertFiscalProfileDto): Promise<FiscalProfile> {
    const parts = splitNit(dto.nit);
    if (!parts || calculateDv(parts.base) !== parts.dv) {
      throw new BadRequestException('Invalid NIT or verification digit');
    }
    await this.repo.upsert(
      {
        company_id: issuerId,
        nit: parts.base,
        dv: parts.dv,
        legal_name: dto.legal_name,
        regime: dto.regime ?? null,
        responsibility_codes: dto.responsibility_codes,
      },
      ['company_id'],
    );
    return this.get(issuerId);
  }
}
