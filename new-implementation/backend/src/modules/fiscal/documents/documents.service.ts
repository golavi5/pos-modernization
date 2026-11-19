import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { PlemsiConfig } from '../emission/plemsi/plemsi-config.entity';
import { PlemsiConfigService } from '../emission/plemsi/plemsi-config.service';
import { toPage } from '../common/pagination';
import { EmissionOutbox } from '../outbox/outbox.entity';
import { CreateDocumentDto, DocumentListQueryDto } from './document.dto';
import { toDraft } from './document.mapper';

/** What an API client sees of an outbox row. `last_error` is the provider's or DIAN's reason, never an internal message. */
export interface DocumentView {
  id: string;
  type: string;
  status: string;
  prefix: string | null;
  number: number | null;
  cufe: string | null;
  qr: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export const toView = (r: EmissionOutbox): DocumentView & { id: string } => ({
  id: r.id,
  type: r.document_type,
  status: r.status,
  prefix: r.prefix,
  number: r.number,
  cufe: r.cufe,
  qr: r.qr,
  last_error: r.last_error,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(EmissionOutbox) private readonly outbox: Repository<EmissionOutbox>,
    @InjectRepository(PlemsiConfig) private readonly configs: Repository<PlemsiConfig>,
    private readonly plemsi: PlemsiConfigService,
  ) {}

  /** Queues the document; the worker numbers, sends and confirms it. Poll `GET /documents/:id`. */
  async create(issuerId: string, dto: CreateDocumentDto): Promise<DocumentView> {
    const cfg = await this.configs.findOneBy({ company_id: issuerId });
    const hasNumbering = dto.type === 'invoice' ? cfg?.invoice_prefix && cfg.invoice_resolution : cfg?.credit_note_prefix && cfg.credit_note_resolution;
    if (!cfg?.emission_enabled) throw new BadRequestException('Emission is not enabled for this issuer');
    if (!hasNumbering) throw new BadRequestException(`Numbering for ${dto.type} is not configured`);
    const row = await this.outbox.save(
      this.outbox.create({
        company_id: issuerId,
        order_id: null,
        document_type: dto.type,
        status: 'pending',
        draft: toDraft(dto),
        next_attempt_at: new Date(),
      }),
    );
    return toView(row);
  }

  async get(issuerId: string, id: string): Promise<DocumentView> {
    return toView(await this.find(issuerId, id));
  }

  async list(issuerId: string, q: DocumentListQueryDto) {
    const rows = await this.outbox.find({
      where: { company_id: issuerId, ...(q.status && { status: q.status as EmissionOutbox['status'] }), ...(q.cursor && { id: MoreThan(q.cursor) }) },
      order: { id: 'ASC' },
      take: q.limit + 1,
    });
    const page = toPage(rows, q.limit);
    return { ...page, data: page.data.map(toView) };
  }

  async pdf(issuerId: string, id: string): Promise<{ filename: string; data: Buffer }> {
    const row = await this.find(issuerId, id);
    if (!row.cufe) throw new ConflictException('The document has no CUFE yet');
    const { base64, filename } = await (await this.plemsi.adapterFor(issuerId)).getPdf(row.cufe);
    return { filename, data: Buffer.from(base64, 'base64') };
  }

  private async find(issuerId: string, id: string): Promise<EmissionOutbox> {
    const row = await this.outbox.findOneBy({ id, company_id: issuerId });
    if (!row) throw new NotFoundException('Document not found');
    return row;
  }
}
