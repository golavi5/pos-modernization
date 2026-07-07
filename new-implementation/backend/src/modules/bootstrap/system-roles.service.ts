import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../auth/entities/role.entity';
import { SYSTEM_ROLES } from '../auth/constants/system-roles';

/**
 * Idempotent system-role reconciliation. Runs on every boot (via
 * BootstrapService) so both fresh and already-bootstrapped databases end up
 * with the full canonical role set. Creates only missing roles; never mutates
 * or duplicates an existing one.
 */
@Injectable()
export class SystemRolesService {
  private readonly logger = new Logger(SystemRolesService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async ensureSystemRoles(): Promise<Map<string, Role>> {
    const byName = new Map<string, Role>();
    for (const def of SYSTEM_ROLES) {
      let role = await this.roleRepo.findOne({ where: { name: def.name } });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            name: def.name,
            description: def.description,
            is_system_role: true,
            company_id: null,
          }),
        );
        this.logger.log(`Created system role "${def.name}".`);
      }
      byName.set(def.name, role);
    }
    return byName;
  }
}
