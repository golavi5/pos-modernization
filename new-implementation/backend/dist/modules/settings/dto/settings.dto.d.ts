export declare class UpdateCompanyDto {
    companyName?: string;
    nit?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    city?: string;
    country?: string;
}
export declare class UpdateTaxDto {
    taxRate?: number;
    taxIncludedInPrice?: boolean;
    currency?: string;
    locale?: string;
}
export declare class UpdatePaymentMethodsDto {
    paymentCash?: boolean;
    paymentCard?: boolean;
    paymentTransfer?: boolean;
    paymentCredit?: boolean;
    paymentTransferInstructions?: string;
}
export declare class UpdateInventorySettingsDto {
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    defaultReorderPoint?: number;
}
export declare class UpdateSalesSettingsDto {
    requireCustomer?: boolean;
    printReceiptAutomatically?: boolean;
    receiptFooter?: string;
    largeSaleThreshold?: number;
}
export declare class UpdateLoyaltySettingsDto {
    loyaltyEnabled?: boolean;
    loyaltyPointsPerCurrency?: number;
    loyaltyPointValue?: number;
}
