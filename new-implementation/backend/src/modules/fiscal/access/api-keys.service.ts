import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';

export const hashApiKey = (raw: string): string => createHash('sha256').update(raw).digest('hex');

@Injectable()
export class ApiKeysService {
  constructor(@InjectRepository(ApiKey) private readonly repo: Repository<ApiKey>) {}

  /** The plaintext key is returned once and never stored. */
  async create(companyId: string, name: string, scopes: string[]) {
    const key = `fsk_${randomBytes(32).toString('base64url')}`;
    const row = await this.repo.save(
      this.repo.create({
        company_id: companyId,
        name,
        scopes,
        key_prefix: key.slice(0, 12),
        key_hash: hashApiKey(key),
      }),
    );
    return { id: row.id, name, scopes, key_prefix: row.key_prefix, key };
  }

  /** Active key for a raw credential, or null. Also stamps `last_used_at`. */
  async authenticate(raw: string): Promise<ApiKey | null> {
    const row = await this.repo.findOne({ where: { key_hash: hashApiKey(raw), revoked_at: IsNull() } });
    if (!row) return null;
    await this.repo.update(row.id, { last_used_at: new Date() });
    return row;
  }

  list(companyId: string) {
    return this.repo.find({
      where: { company_id: companyId },
      select: ['id', 'name', 'key_prefix', 'scopes', 'revoked_at', 'last_used_at', 'created_at'],
      order: { created_at: 'DESC' },
    });
  }

  async revoke(companyId: string, id: string): Promise<boolean> {
    const res = await this.repo.update({ id, company_id: companyId, revoked_at: IsNull() }, { revoked_at: new Date() });
    return (res.affected ?? 0) > 0;
  }
}
