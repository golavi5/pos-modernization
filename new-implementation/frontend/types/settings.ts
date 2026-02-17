export interface Settings {
  id: number;
  companyId: string;
  // Company
  companyName: string;
  nit?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  // Tax
  taxRate: number;
  taxIncludedInPrice: boolean;
  currency: string;
  locale: string;
  // Payment methods
  paymentCash: boolean;
  paymentCard: boolean;
  paymentTransfer: boolean;
  paymentCredit: boolean;
  paymentTransferInstructions?: string;
  // Inventory
  trackInventory: boolean;
  allowNegativeStock: boolean;
  defaultReorderPoint: number;
  // Sales
  requireCustomer: boolean;
  printReceiptAutomatically: boolean;
  receiptFooter?: string;
  largeSaleThreshold: number;
  // Loyalty
  loyaltyEnabled: boolean;
  loyaltyPointsPerCurrency: number;
  loyaltyPointValue: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export type UpdateCompanyDto = Partial<Pick<Settings,
  'companyName' | 'nit' | 'address' | 'phone' | 'email' | 'website' | 'logoUrl' | 'city' | 'country'
>>;

export type UpdateTaxDto = Partial<Pick<Settings,
  'taxRate' | 'taxIncludedInPrice' | 'currency' | 'locale'
>>;

export type UpdatePaymentMethodsDto = Partial<Pick<Settings,
  'paymentCash' | 'paymentCard' | 'paymentTransfer' | 'paymentCredit' | 'paymentTransferInstructions'
>>;

export type UpdateInventoryDto = Partial<Pick<Settings,
  'trackInventory' | 'allowNegativeStock' | 'defaultReorderPoint'
>>;

export type UpdateSalesDto = Partial<Pick<Settings,
  'requireCustomer' | 'printReceiptAutomatically' | 'receiptFooter' | 'largeSaleThreshold'
>>;

export type UpdateLoyaltyDto = Partial<Pick<Settings,
  'loyaltyEnabled' | 'loyaltyPointsPerCurrency' | 'loyaltyPointValue'
>>;
