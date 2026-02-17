import { Controller, Get, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SettingsService } from './services/settings.service';
import {
  UpdateCompanyDto,
  UpdateTaxDto,
  UpdatePaymentMethodsDto,
  UpdateInventorySettingsDto,
  UpdateSalesSettingsDto,
  UpdateLoyaltySettingsDto,
} from './dto/settings.dto';
import { Settings } from './entities/settings.entity';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all company settings' })
  async getSettings(@CurrentUser() user: any): Promise<Settings> {
    return this.settingsService.getSettings(user.companyId);
  }

  @Patch('company')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company information' })
  async updateCompany(
    @CurrentUser() user: any,
    @Body() dto: UpdateCompanyDto,
  ): Promise<Settings> {
    return this.settingsService.updateCompany(user.companyId, dto);
  }

  @Patch('tax')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tax configuration' })
  async updateTax(
    @CurrentUser() user: any,
    @Body() dto: UpdateTaxDto,
  ): Promise<Settings> {
    return this.settingsService.updateTax(user.companyId, dto);
  }

  @Patch('payment-methods')
  @Roles('admin')
  @ApiOperation({ summary: 'Update payment method settings' })
  async updatePaymentMethods(
    @CurrentUser() user: any,
    @Body() dto: UpdatePaymentMethodsDto,
  ): Promise<Settings> {
    return this.settingsService.updatePaymentMethods(user.companyId, dto);
  }

  @Patch('inventory')
  @Roles('admin')
  @ApiOperation({ summary: 'Update inventory settings' })
  async updateInventory(
    @CurrentUser() user: any,
    @Body() dto: UpdateInventorySettingsDto,
  ): Promise<Settings> {
    return this.settingsService.updateInventory(user.companyId, dto);
  }

  @Patch('sales')
  @Roles('admin')
  @ApiOperation({ summary: 'Update sales settings' })
  async updateSales(
    @CurrentUser() user: any,
    @Body() dto: UpdateSalesSettingsDto,
  ): Promise<Settings> {
    return this.settingsService.updateSales(user.companyId, dto);
  }

  @Patch('loyalty')
  @Roles('admin')
  @ApiOperation({ summary: 'Update loyalty program settings' })
  async updateLoyalty(
    @CurrentUser() user: any,
    @Body() dto: UpdateLoyaltySettingsDto,
  ): Promise<Settings> {
    return this.settingsService.updateLoyalty(user.companyId, dto);
  }

  @Patch('reset')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset settings to defaults (admin)' })
  async resetToDefaults(@CurrentUser() user: any): Promise<Settings> {
    return this.settingsService.resetToDefaults(user.companyId);
  }
}
