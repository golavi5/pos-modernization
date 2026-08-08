import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemRolesService } from '../system-roles.service';
import { Role } from '../../auth/entities/role.entity';
import { SYSTEM_ROLES } from '../../auth/constants/system-roles';

describe('SystemRolesService.ensureSystemRoles', () => {
  function build(existing: Partial<Role>[]) {
    const store = [...existing];
    const repo = {
      findOne: jest.fn(({ where: { name } }) =>
        Promise.resolve(store.find((r) => r.name === name) ?? null),
      ),
      create: jest.fn((r) => r),
      save: jest.fn((r) => {
        const saved = { ...r, id: `id-${r.name}` };
        store.push(saved);
        return Promise.resolve(saved);
      }),
    };
    return { repo, store };
  }

  async function svc(repo: any): Promise<SystemRolesService> {
    const mod = await Test.createTestingModule({
      providers: [
        SystemRolesService,
        { provide: getRepositoryToken(Role), useValue: repo },
      ],
    }).compile();
    return mod.get(SystemRolesService);
  }

  it('creates every missing system role as a system-wide role', async () => {
    const { repo } = build([]);
    const result = await (await svc(repo)).ensureSystemRoles();

    expect(repo.save).toHaveBeenCalledTimes(SYSTEM_ROLES.length);
    expect(result.size).toBe(SYSTEM_ROLES.length);
    const saved = repo.save.mock.calls.map((c: any[]) => c[0]);
    for (const s of saved) {
      expect(s.is_system_role).toBe(true);
      expect(s.company_id).toBeNull();
    }
    expect(result.get('superadmin')).toBeDefined();
  });

  it('is idempotent — does not recreate existing roles', async () => {
    const existing = SYSTEM_ROLES.map((r) => ({ ...r, id: `id-${r.name}`, is_system_role: true, company_id: null }));
    const { repo } = build(existing);
    const result = await (await svc(repo)).ensureSystemRoles();

    expect(repo.save).not.toHaveBeenCalled();
    expect(result.size).toBe(SYSTEM_ROLES.length);
  });

  it('creates only the missing roles when some already exist', async () => {
    const { repo } = build([{ name: 'admin', id: 'id-admin', is_system_role: true, company_id: null }]);
    await (await svc(repo)).ensureSystemRoles();
    expect(repo.save).toHaveBeenCalledTimes(SYSTEM_ROLES.length - 1);
  });

  it('returns the exact existing Role object as the map value (no re-creation)', async () => {
    const adminRole = { name: 'admin', id: 'id-admin', is_system_role: true, company_id: null };
    const { repo } = build([adminRole]);
    const result = await (await svc(repo)).ensureSystemRoles();

    // Reference identity: the map must hold the very object findOne returned,
    // not a copy — proves existing roles are passed through untouched.
    expect(result.get('admin')).toBe(adminRole);
  });

  it('creates each missing role with its canonical description', async () => {
    const { repo } = build([]);
    await (await svc(repo)).ensureSystemRoles();

    const saved = repo.save.mock.calls.map((c: any[]) => c[0]);
    for (const def of SYSTEM_ROLES) {
      const match = saved.find((s: any) => s.name === def.name);
      expect(match).toBeDefined();
      expect(match.description).toBe(def.description);
    }
  });
});
