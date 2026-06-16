import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Company } from '../companies/entities/company.entity';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Company])],
  providers: [BootstrapService],
})
export class BootstrapModule {}
