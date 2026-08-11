import { InventoryLocationsService } from '../services/inventory-locations.service';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';

describe('InventoryLocationsService.ensureDefaultLocation', () => {
  const COMPANY = 'c0000000-0000-4000-8000-000000000001';
  let service: InventoryLocationsService;
  let manager: any;
  let saved: any[];

  beforeEach(() => {
    saved = [];
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_e: any, obj: any) => ({ id: `id-${saved.length}`, ...obj })),
      save: jest.fn(async (_entity: any, obj: any) => {
        saved.push(obj);
        return obj;
      }),
    };
    service = new InventoryLocationsService();
  });

  it('crea bodega y ubicación cuando no hay ninguna', async () => {
    manager.findOne.mockResolvedValue(null);

    const id = await service.ensureDefaultLocation(COMPANY, manager);

    expect(manager.save).toHaveBeenCalledTimes(2);
    const [warehouse, location] = saved;
    expect(warehouse.company_id).toBe(COMPANY);
    expect(location.company_id).toBe(COMPANY);
    expect(location.warehouse_id).toBe(warehouse.id);
    expect(id).toBe(location.id);
  });

  it('reutiliza la ubicación existente sin crear nada', async () => {
    manager.findOne.mockImplementation(async (entity: any) => {
      if (entity === Warehouse) return { id: 'w1', company_id: COMPANY };
      if (entity === WarehouseLocation) return { id: 'l1', company_id: COMPANY };
      return null;
    });

    const id = await service.ensureDefaultLocation(COMPANY, manager);

    expect(id).toBe('l1');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('crea solo la ubicación si la bodega ya existe', async () => {
    manager.findOne.mockImplementation(async (entity: any) => {
      if (entity === Warehouse) return { id: 'w1', company_id: COMPANY };
      return null;
    });

    await service.ensureDefaultLocation(COMPANY, manager);

    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(saved[0].warehouse_id).toBe('w1');
  });
});
