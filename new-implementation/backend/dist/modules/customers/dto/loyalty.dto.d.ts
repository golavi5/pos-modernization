export declare class AddLoyaltyPointsDto {
    points: number;
    reason?: string;
}
export declare class UpdateLoyaltyPointsDto {
    points: number;
    operation: 'add' | 'subtract' | 'set';
    reason?: string;
}
