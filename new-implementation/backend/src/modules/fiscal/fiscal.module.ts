import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from './access/api-key.guard';
import { ApiKeysController } from './access/api-keys.controller';
import { ApiKeysService } from './access/api-keys.service';
import { ApiKey } from './access/entities/api-key.entity';
import { IdempotencyKey } from './common/idempotency-key.entity';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';
import { PlemsiConfig } from './emission/plemsi/plemsi-config.entity';
import { PlemsiConfigController } from './emission/plemsi/plemsi-config.controller';
import { PlemsiConfigService } from './emission/plemsi/plemsi-config.service';
import { FiscalProfile } from './fiscal-profile/entities/fiscal-profile.entity';
import { FiscalProfileController } from './fiscal-profile/fiscal-profile.controller';
import { FiscalProfileService } from './fiscal-profile/fiscal-profile.service';
import { ThirdParty } from './third-parties/entities/third-party.entity';
import { ThirdPartiesController } from './third-parties/third-parties.controller';
import { ThirdPartiesService } from './third-parties/third-parties.service';

/**
 * Fiscal bounded context (DESIGN-001 §3). Boundary rule: nothing under `fiscal/`
 * imports internals of `sales`, `inventory` or `customers` (enforced in .eslintrc.json).
 * Public API: `/fiscal/v1`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, IdempotencyKey, FiscalProfile, ThirdParty, PlemsiConfig])],
  controllers: [PlemsiConfigController, ApiKeysController, FiscalProfileController, ThirdPartiesController],
  providers: [PlemsiConfigService, ApiKeysService, ApiKeyGuard, IdempotencyInterceptor, FiscalProfileService, ThirdPartiesService],
})
export class FiscalModule {}
