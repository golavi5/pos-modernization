import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FiscalRequestContext } from './scopes';

export const FiscalContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): FiscalRequestContext => ctx.switchToHttp().getRequest().fiscal,
);
