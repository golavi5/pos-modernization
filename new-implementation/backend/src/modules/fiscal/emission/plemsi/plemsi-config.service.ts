import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalProfile } from '../../fiscal-profile/entities/fiscal-profile.entity';
import { loadKek, open, seal } from '../../custody/envelope';
import { PLEMSI_BASE_URL, PlemsiEnvironment } from './plemsi.constants';
import { PlemsiAdapter } from './plemsi.adapter';
import { PlemsiConfig } from './plemsi-config.entity';

@Injectable()
export class PlemsiConfigService {
  constructor(
    @InjectRepository(PlemsiConfig) private readonly repo: Repository<PlemsiConfig>,
    @InjectRepository(FiscalProfile) private readonly profiles: Repository<FiscalProfile>,
  ) {}

  async set(companyId: string, environment: PlemsiEnvironment, token: string): Promise<void> {
    const { wrappedKey, ciphertext } = seal(loadKek(), companyId, token);
    await this.repo.upsert(
      { company_id: companyId, environment, wrapped_data_key: wrappedKey, token_encrypted: ciphertext },
      ['company_id'],
    );
  }

  /** Never returns the token. */
  async describe(companyId: string) {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const { environment, updated_at, emission_enabled, pos_prefix, pos_resolution } = row;
    return { environment, updated_at, emission_enabled, pos_prefix, pos_resolution };
  }

  /** Turning emission on needs everything the worker will need, so a sale never closes into a row that cannot be sent. */
  async configureEmission(companyId: string, dto: { enabled: boolean; pos_prefix?: string; pos_resolution?: string }): Promise<void> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const pos_prefix = dto.pos_prefix ?? row.pos_prefix;
    const pos_resolution = dto.pos_resolution ?? row.pos_resolution;
    if (dto.enabled) {
      if (!pos_prefix || !pos_resolution) throw new BadRequestException('pos_prefix and pos_resolution are required to enable emission');
      if (!(await this.profiles.existsBy({ company_id: companyId }))) throw new BadRequestException('Set the fiscal profile first');
    }
    await this.repo.update(row.id, { emission_enabled: dto.enabled, pos_prefix, pos_resolution });
  }

  /** Decrypts only here, in memory, to build the adapter for one issuer. */
  async adapterFor(companyId: string): Promise<PlemsiAdapter> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const token = open(loadKek(), companyId, { wrappedKey: row.wrapped_data_key, ciphertext: row.token_encrypted });
    return new PlemsiAdapter({ baseUrl: PLEMSI_BASE_URL[row.environment as PlemsiEnvironment], token });
  }
}
