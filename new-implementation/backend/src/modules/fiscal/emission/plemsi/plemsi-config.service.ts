import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { loadKek, open, seal } from '../../custody/envelope';
import { PLEMSI_BASE_URL, PlemsiEnvironment } from './plemsi.constants';
import { PlemsiAdapter } from './plemsi.adapter';
import { PlemsiConfig } from './plemsi-config.entity';

@Injectable()
export class PlemsiConfigService {
  constructor(@InjectRepository(PlemsiConfig) private readonly repo: Repository<PlemsiConfig>) {}

  async set(companyId: string, environment: PlemsiEnvironment, token: string): Promise<void> {
    const { wrappedKey, ciphertext } = seal(loadKek(), companyId, token);
    await this.repo.upsert(
      { company_id: companyId, environment, wrapped_data_key: wrappedKey, token_encrypted: ciphertext },
      ['company_id'],
    );
  }

  /** Never returns the token. */
  async describe(companyId: string): Promise<{ environment: string; updated_at: Date }> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    return { environment: row.environment, updated_at: row.updated_at };
  }

  /** Decrypts only here, in memory, to build the adapter for one issuer. */
  async adapterFor(companyId: string): Promise<PlemsiAdapter> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const token = open(loadKek(), companyId, { wrappedKey: row.wrapped_data_key, ciphertext: row.token_encrypted });
    return new PlemsiAdapter({ baseUrl: PLEMSI_BASE_URL[row.environment as PlemsiEnvironment], token });
  }
}
