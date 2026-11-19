import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { ApiKeysService } from './api-keys.service';
import { FiscalRequestContext, FiscalScope } from './scopes';

const SCOPES_KEY = 'fiscal_scopes';
export const RequireScopes = (...scopes: FiscalScope[]) => SetMetadata(SCOPES_KEY, scopes);

/** Authenticates app credentials for /fiscal/v1. Independent of the POS JWT. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    const raw = auth?.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-api-key'];
    if (typeof raw !== 'string' || !raw) throw new UnauthorizedException('Missing API key');

    const key = await this.keys.authenticate(raw);
    if (!key) throw new UnauthorizedException('Invalid API key');

    const required = this.reflector.get<FiscalScope[]>(SCOPES_KEY, ctx.getHandler()) ?? [];
    const missing = required.filter((s) => !key.scopes.includes(s));
    if (missing.length) throw new ForbiddenException(`Missing scope: ${missing.join(', ')}`);

    const fiscal: FiscalRequestContext = { issuerId: key.company_id, apiKeyId: key.id, scopes: key.scopes };
    req.fiscal = fiscal;
    this.logger.assign({ issuerId: key.company_id });
    return true;
  }
}
