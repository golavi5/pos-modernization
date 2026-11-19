import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { PageQueryDto, toPage } from '../common/pagination';
import { splitNit, calculateDv } from '../fiscal-profile/nit';
import { CreateThirdPartyDto } from './dto/third-party.dto';
import { ThirdParty } from './entities/third-party.entity';

@Injectable()
export class ThirdPartiesService {
  constructor(@InjectRepository(ThirdParty) private readonly repo: Repository<ThirdParty>) {}

  async create(issuerId: string, dto: CreateThirdPartyDto): Promise<ThirdParty> {
    const parts = splitNit(dto.nit);
    if (!parts || calculateDv(parts.base) !== parts.dv) {
      throw new BadRequestException('Invalid NIT or verification digit');
    }
    try {
      return await this.repo.save(
        this.repo.create({
          company_id: issuerId,
          nit: parts.base,
          dv: parts.dv,
          name: dto.name,
          responsibility_codes: dto.responsibility_codes,
          notification_email: dto.notification_email ?? null,
          customer_id: dto.customer_id ?? null,
        }),
      );
    } catch (e) {
      if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictException('Third party already exists');
      throw e;
    }
  }

  async list(issuerId: string, q: PageQueryDto) {
    const rows = await this.repo.find({
      where: { company_id: issuerId, ...(q.cursor && { id: MoreThan(q.cursor) }) },
      order: { id: 'ASC' },
      take: q.limit + 1,
    });
    return toPage(rows, q.limit);
  }

  async get(issuerId: string, id: string): Promise<ThirdParty> {
    const row = await this.repo.findOneBy({ id, company_id: issuerId });
    if (!row) throw new NotFoundException('Third party not found');
    return row;
  }
}
