import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

const CODES: Record<number, string> = {
  400: 'validation_failed',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable',
};

/** /fiscal/v1 error shape: `{ error: { code, message, details? } }`. */
@Catch()
export class FiscalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('FiscalV1');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      return res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
    }
    const status = exception.getStatus();
    const body = exception.getResponse();
    const raw = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
    const details = Array.isArray(raw) ? raw : undefined;
    const message = Array.isArray(raw) ? 'Request validation failed' : (raw ?? HttpStatus[status]);
    res.status(status).json({ error: { code: CODES[status] ?? 'error', message, ...(details && { details }) } });
  }
}
