import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ProductsModule } from './products.module';
import { ProductsService } from './products.service';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// SPEC-BACK-005: `GET /products/categories` returned 404 in the browser because
// `GET /products/:id` was registered first and captured it. Mocked-service unit
// tests never go through routing, so this drives real HTTP through the module's
// own controller list (and order).
describe('products routing', () => {
  let app: INestApplication;
  const findOneForApi = jest.fn();
  const findAll = jest.fn().mockResolvedValue([{ id: 'c1', name: 'Drinks' }]);

  beforeAll(async () => {
    const controllers = Reflect.getMetadata('controllers', ProductsModule);
    const allow = {
      canActivate: (ctx) => {
        ctx.switchToHttp().getRequest().user = { id: 'u1', company_id: 'co1' };
        return true;
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers,
      providers: [
        { provide: ProductsService, useValue: { findOneForApi } },
        { provide: ProductCategoriesService, useValue: { findAll } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allow)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products/categories reaches the categories controller, not GET /products/:id', async () => {
    await request(app.getHttpServer())
      .get('/products/categories')
      .expect(200)
      .expect([{ id: 'c1', name: 'Drinks' }]);
    expect(findAll).toHaveBeenCalledWith('co1');
    expect(findOneForApi).not.toHaveBeenCalled();
  });
});
