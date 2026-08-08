import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let query: jest.Mock;

  async function build(): Promise<void> {
    query = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getDataSourceToken(), useValue: { query } as Partial<DataSource> },
      ],
    }).compile();
    controller = module.get(AppController);
  }

  beforeEach(build);

  describe('liveness /health', () => {
    it('returns OK and never touches the datasource', () => {
      query.mockRejectedValue(new Error('db down'));
      const res = controller.getHealth();
      expect(res.status).toBe('OK');
      expect(typeof res.timestamp).toBe('string');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('readiness /health/ready', () => {
    it('returns ready + db up when SELECT 1 succeeds', async () => {
      query.mockResolvedValue([{ '1': 1 }]);
      const res = await controller.getReadiness();
      expect(res.status).toBe('ready');
      expect(res.db).toBe('up');
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('throws 503 ServiceUnavailable when the db ping fails', async () => {
      query.mockRejectedValue(new Error('connection refused'));
      await expect(controller.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      try {
        await controller.getReadiness();
      } catch (err: any) {
        expect(err.getStatus()).toBe(503);
        expect(err.getResponse()).toMatchObject({ status: 'unavailable', db: 'down' });
      }
    });
  });
});
