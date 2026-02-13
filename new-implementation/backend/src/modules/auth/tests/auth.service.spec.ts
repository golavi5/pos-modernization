import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    phone: '1234567890',
    company_id: 'company-123',
    is_active: true,
    last_login: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    roles: [],
    getRoleNames: jest.fn().mockReturnValue(['user']),
    hasRole: jest.fn(),
    hasAnyRole: jest.fn(),
    hasAllRoles: jest.fn(),
  };

  const mockRole: Role = {
    id: 'role-123',
    name: 'admin',
    description: 'Administrator role',
    company_id: null,
    is_system_role: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    users: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['roles'],
      });
    });

    it('should return null if user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const inactiveUser = { ...mockUser, is_active: false };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token, refresh token, and user', async () => {
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt_token');

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresIn', 3600);
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should update last login timestamp', async () => {
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt_token');

      await service.login(mockUser);

      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User',
      company_id: 'company-123',
      first_name: 'New',
      last_name: 'User',
      phone: '9876543210',
    };

    it('should register a new user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.register(createUserDto);

      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('password_hash');
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if password is weak', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const weakPasswordDto = {
        ...createUserDto,
        password: 'weak', // Password too short
      };

      await expect(service.register(weakPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate password strength', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const weakPasswords = [
        'short', // Too short
        'nouppercasepassword123!', // No uppercase
        'NOLOWERCASEPASSWORD123!', // No lowercase
        'NoNumbersPassword!', // No number
        'NoSpecialChar123', // No special char
      ];

      for (const password of weakPasswords) {
        const dtoWithWeakPassword = { ...createUserDto, password };
        await expect(service.register(dtoWithWeakPassword)).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });

  describe('refreshToken', () => {
    it('should return new access and refresh tokens', async () => {
      const refreshToken = 'valid_refresh_token';

      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'user-123',
        type: 'refresh',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('new_jwt_token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: AUTH_CONSTANTS.JWT.SECRET_KEY,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const refreshToken = 'invalid_refresh_token';

      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'nonexistent-user',
      });
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const invalidToken = 'invalid_token';

      jest
        .spyOn(jwtService, 'verify')
        .mockImplementation(() => {
          throw new Error('Invalid token');
        });

      await expect(service.refreshToken(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.changePassword('user-123', changePasswordDto);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
        AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
      );
    });

    it('should throw BadRequestException if old password is incorrect', async () => {
      const changePasswordDto = {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new passwords do not match', async () => {
      const changePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'DifferentPassword789!',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const changePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent-user', changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserById('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return user profile', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getCurrentUserProfile('user-123');

      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('password_hash');
      expect(result.id).toEqual(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getCurrentUserProfile('nonexistent-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const result = await service.logout('user-123');

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
