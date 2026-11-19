import { createHash } from 'crypto';
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';
import { Repository } from 'typeorm';
import { FiscalRequestContext } from '../access/scopes';
import { IdempotencyKey } from './idempotency-key.entity';

const IDEMPOTENT = 'fiscal_idempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT, true);

/**
 * `Idempotency-Key` for mutating /fiscal/v1 calls. The unique `(company_id, key)`
 * index arbitrates concurrent duplicates. Same key + same body → stored response
 * replayed; same key + different body → 422; first call still running → 409.
 * A failed call releases its key so the client can retry.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(IdempotencyKey) private readonly repo: Repository<IdempotencyKey>,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (!this.reflector.get<boolean>(IDEMPOTENT, ctx.getHandler())) return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !key || key.length > 255) {
      throw new BadRequestException('Idempotency-Key header is required (max 255 chars)');
    }
    const { issuerId } = req.fiscal as FiscalRequestContext;
    const request_hash = createHash('sha256')
      .update(`${req.method} ${req.originalUrl}\n${JSON.stringify(req.body ?? null)}`)
      .digest('hex');

    try {
      await this.repo.insert({ company_id: issuerId, key, request_hash });
    } catch (e) {
      if ((e as { code?: string }).code !== 'ER_DUP_ENTRY') throw e;
      const prior = await this.repo.findOneByOrFail({ company_id: issuerId, key });
      if (prior.request_hash !== request_hash) {
        throw new UnprocessableEntityException('Idempotency-Key reused with a different request');
      }
      if (prior.response_status === null) throw new ConflictException('A request with this Idempotency-Key is in progress');
      res.status(prior.response_status);
      return of(prior.response_body);
    }

    const status: number = Reflect.getMetadata('__httpCode__', ctx.getHandler()) ?? (req.method === 'POST' ? 201 : 200);
    return next.handle().pipe(
      mergeMap((body) =>
        from(this.repo.update({ company_id: issuerId, key }, { response_status: status, response_body: body ?? null })).pipe(
          mergeMap(() => of(body)),
        ),
      ),
      catchError((err) =>
        from(this.repo.delete({ company_id: issuerId, key })).pipe(mergeMap(() => throwError(() => err))),
      ),
    );
  }
}
