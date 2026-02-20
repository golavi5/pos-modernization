"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./entities/user.entity");
const user_response_dto_1 = require("./dto/user-response.dto");
const auth_constants_1 = require("./constants/auth.constants");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepository, jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async validateUser(email, password) {
        try {
            const user = await this.userRepository.findOne({
                where: { email },
                relations: ['roles'],
            });
            if (!user || !user.is_active) {
                return null;
            }
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                this.logger.warn(`Failed login attempt for email: ${email}`);
                return null;
            }
            return user;
        }
        catch (error) {
            this.logger.error(`Error validating user: ${error.message}`);
            return null;
        }
    }
    async login(user) {
        try {
            user.last_login = new Date();
            await this.userRepository.save(user);
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            return {
                accessToken,
                refreshToken,
                user: this.mapUserToResponseDto(user),
                expiresIn: 3600,
                tokenType: 'Bearer',
            };
        }
        catch (error) {
            this.logger.error(`Login error: ${error.message}`);
            throw new common_1.UnauthorizedException(auth_constants_1.AUTH_CONSTANTS.ERRORS.UNAUTHORIZED);
        }
    }
    async register(createUserDto) {
        try {
            const existingUser = await this.userRepository.findOne({
                where: { email: createUserDto.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException(auth_constants_1.AUTH_CONSTANTS.ERRORS.DUPLICATE_EMAIL);
            }
            this.validatePasswordStrength(createUserDto.password);
            const hashedPassword = await bcrypt.hash(createUserDto.password, auth_constants_1.AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS);
            const user = this.userRepository.create({
                email: createUserDto.email,
                password_hash: hashedPassword,
                name: createUserDto.name,
                first_name: createUserDto.first_name,
                last_name: createUserDto.last_name,
                phone: createUserDto.phone,
                company_id: createUserDto.company_id,
                is_active: true,
                roles: [],
            });
            const savedUser = await this.userRepository.save(user);
            this.logger.log(`New user registered: ${savedUser.email}`);
            return this.mapUserToResponseDto(savedUser);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                throw error;
            }
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Registration error: ${error.message}`);
            throw new common_1.BadRequestException('Failed to register user');
        }
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: auth_constants_1.AUTH_CONSTANTS.JWT.SECRET_KEY,
            });
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
                relations: ['roles'],
            });
            if (!user || !user.is_active) {
                throw new common_1.UnauthorizedException(auth_constants_1.AUTH_CONSTANTS.ERRORS.REFRESH_TOKEN_EXPIRED);
            }
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: this.mapUserToResponseDto(user),
                expiresIn: 3600,
                tokenType: 'Bearer',
            };
        }
        catch (error) {
            this.logger.error(`Token refresh error: ${error.message}`);
            throw new common_1.UnauthorizedException(auth_constants_1.AUTH_CONSTANTS.ERRORS.REFRESH_TOKEN_EXPIRED);
        }
    }
    async changePassword(userId, changePasswordDto) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
            });
            if (!user) {
                throw new common_1.NotFoundException(auth_constants_1.AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND);
            }
            const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password_hash);
            if (!isPasswordValid) {
                throw new common_1.BadRequestException(auth_constants_1.AUTH_CONSTANTS.ERRORS.PASSWORD_MISMATCH);
            }
            if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
                throw new common_1.BadRequestException('Passwords do not match');
            }
            this.validatePasswordStrength(changePasswordDto.newPassword);
            const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, auth_constants_1.AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS);
            user.password_hash = hashedPassword;
            await this.userRepository.save(user);
            this.logger.log(`Password changed for user: ${user.email}`);
            return { message: 'Password changed successfully' };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Change password error: ${error.message}`);
            throw new common_1.BadRequestException('Failed to change password');
        }
    }
    async getUserById(userId) {
        try {
            return await this.userRepository.findOne({
                where: { id: userId },
                relations: ['roles'],
            });
        }
        catch (error) {
            this.logger.error(`Error fetching user: ${error.message}`);
            return null;
        }
    }
    async getUserByEmail(email) {
        try {
            return await this.userRepository.findOne({
                where: { email },
                relations: ['roles'],
            });
        }
        catch (error) {
            this.logger.error(`Error fetching user by email: ${error.message}`);
            return null;
        }
    }
    async getCurrentUserProfile(userId) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new common_1.NotFoundException(auth_constants_1.AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND);
        }
        return this.mapUserToResponseDto(user);
    }
    async logout(userId) {
        this.logger.log(`User logged out: ${userId}`);
        return { message: 'Logged out successfully' };
    }
    generateAccessToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.getRoleNames(),
        };
        return this.jwtService.sign(payload, {
            secret: auth_constants_1.AUTH_CONSTANTS.JWT.SECRET_KEY,
            expiresIn: auth_constants_1.AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY,
        });
    }
    generateRefreshToken(user) {
        const payload = {
            sub: user.id,
            type: auth_constants_1.AUTH_CONSTANTS.TOKEN_TYPE.REFRESH,
        };
        return this.jwtService.sign(payload, {
            secret: auth_constants_1.AUTH_CONSTANTS.JWT.SECRET_KEY,
            expiresIn: auth_constants_1.AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY,
        });
    }
    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < auth_constants_1.AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
            errors.push(`at least ${auth_constants_1.AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} characters`);
        }
        if (auth_constants_1.AUTH_CONSTANTS.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push('at least one uppercase letter');
        }
        if (auth_constants_1.AUTH_CONSTANTS.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors.push('at least one lowercase letter');
        }
        if (auth_constants_1.AUTH_CONSTANTS.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
            errors.push('at least one number');
        }
        if (auth_constants_1.AUTH_CONSTANTS.PASSWORD.REQUIRE_SPECIAL_CHARS &&
            !/[@$!%*?&]/.test(password)) {
            errors.push('at least one special character (@$!%*?&)');
        }
        if (errors.length > 0) {
            throw new common_1.BadRequestException(`Password must contain: ${errors.join(', ')}`);
        }
    }
    mapUserToResponseDto(user) {
        const dto = new user_response_dto_1.UserResponseDto();
        dto.id = user.id;
        dto.email = user.email;
        dto.name = user.name;
        dto.first_name = user.first_name;
        dto.last_name = user.last_name;
        dto.phone = user.phone;
        dto.company_id = user.company_id;
        dto.is_active = user.is_active;
        dto.last_login = user.last_login;
        dto.roles = user.getRoleNames();
        dto.created_at = user.created_at;
        dto.updated_at = user.updated_at;
        return dto;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map