import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { AUTH_CONSTANTS } from '../auth/constants/auth.constants';
import { SystemRolesService } from './system-roles.service';

/**
 * First-run admin bootstrap.
 *
 * Production schema is created by migrations (no seed data runs in prod), so a
 * fresh database has zero users and nobody can log in. On startup — only when
 * the users table is EMPTY — this creates one company + the `admin` role + one
 * admin user from env, then never again. Replaces shipping known-password demo
 * users (seed-data.sql is dev-only). See SPEC-CUT-001 S-04.
 *
 * Required env (else it no-ops with a warning):
 *   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (min 12 chars)
 * Optional: BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_COMPANY_NAME
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);
  private static readonly MIN_PASSWORD_LENGTH = 12;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    private readonly systemRoles: SystemRolesService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const systemRoles = await this.systemRoles.ensureSystemRoles();

      const userCount = await this.userRepo.count();
      if (userCount > 0) return; // already initialized — never re-seed users

      const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

      if (!email || !password) {
        this.logger.warn(
          'No users in the database and BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD ' +
            'are not set — no admin will be created. Set them and restart to bootstrap ' +
            'the first admin.',
        );
        return;
      }

      if (password.length < BootstrapService.MIN_PASSWORD_LENGTH) {
        this.logger.error(
          `BOOTSTRAP_ADMIN_PASSWORD must be at least ${BootstrapService.MIN_PASSWORD_LENGTH} ` +
            'characters — skipping admin bootstrap.',
        );
        return;
      }

      const company = await this.companyRepo.save(
        this.companyRepo.create({
          name: process.env.BOOTSTRAP_COMPANY_NAME?.trim() || 'Default Company',
        }),
      );

      const passwordHash = await bcrypt.hash(
        password,
        AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
      );

      const adminRole = systemRoles.get(AUTH_CONSTANTS.ROLES.ADMIN);
      const superadminRole = systemRoles.get(AUTH_CONSTANTS.ROLES.SUPERADMIN);

      await this.userRepo.save(
        this.userRepo.create({
          email,
          password_hash: passwordHash,
          name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator',
          company_id: company.id,
          is_active: true,
          roles: [adminRole, superadminRole], // platform operator on first deploy
        }),
      );

      this.logger.log(
        `Bootstrapped admin user "${email}" (company "${company.name}") with roles admin, superadmin.`,
      );
    } catch (error) {
      // Never let a bootstrap hiccup crash app startup. State stays "empty DB,
      // retryable by fixing env / DB and restarting".
      this.logger.error(`Admin bootstrap failed: ${error?.message ?? error}`);
    }
  }
}
