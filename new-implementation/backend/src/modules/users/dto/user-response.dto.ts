import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isSystemRole: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  lastLogin?: Date;

  @ApiProperty({ type: [RoleResponseDto] })
  roles: RoleResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class UserStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  inactiveUsers: number;

  @ApiProperty()
  newUsersThisMonth: number;

  @ApiProperty()
  usersLoggedInLast30Days: number;

  @ApiProperty()
  usersByRole: { roleName: string; count: number }[];
}
