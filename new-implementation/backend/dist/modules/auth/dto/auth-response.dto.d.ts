import { UserResponseDto } from './user-response.dto';
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
    expiresIn: number;
    tokenType: string;
}
