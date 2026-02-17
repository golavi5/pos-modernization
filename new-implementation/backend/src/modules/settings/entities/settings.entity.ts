import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('settings')
@Index('idx_settings_company', ['companyId'], { unique: true })
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 36, unique: true })
  companyId: string;

  // ── Empresa ───────────────────────────────────────────
  @Column('varchar', { length: 255 })
  companyName: string;

  @Column('varchar', { length: 50, nullable: true })
  nit: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;

  @Column('varchar', { length: 255, nullable: true })
  website: string;

  @Column('varchar', { length: 500, nullable: true })
  logoUrl: string;

  @Column('varchar', { length: 100, nullable: true })
  city: string;

  @Column('varchar', { length: 100, nullable: true })
  country: string;

  // ── Impuestos ─────────────────────────────────────────
  @Column('decimal', { precision: 5, scale: 2, default: 19.00 })
  taxRate: number;           // IVA % (Colombia = 19%)

  @Column({ default: true })
  taxIncludedInPrice: boolean;

  @Column('varchar', { length: 20, default: 'COP' })
  currency: string;

  @Column('varchar', { length: 10, default: 'es-CO' })
  locale: string;

  // ── Métodos de pago ───────────────────────────────────
  @Column({ default: true })
  paymentCash: boolean;

  @Column({ default: true })
  paymentCard: boolean;

  @Column({ default: true })
  paymentTransfer: boolean;

  @Column({ default: false })
  paymentCredit: boolean;

  @Column('text', { nullable: true })
  paymentTransferInstructions: string;   // bank account info

  // ── Inventario ────────────────────────────────────────
  @Column({ default: true })
  trackInventory: boolean;

  @Column({ default: true })
  allowNegativeStock: boolean;

  @Column('int', { default: 5 })
  defaultReorderPoint: number;

  // ── Ventas ────────────────────────────────────────────
  @Column({ default: true })
  requireCustomer: boolean;

  @Column({ default: false })
  printReceiptAutomatically: boolean;

  @Column('text', { nullable: true })
  receiptFooter: string;

  @Column('int', { default: 500000 })
  largeSaleThreshold: number;   // amount to trigger large-sale notification

  // ── Loyalty Points ────────────────────────────────────
  @Column({ default: true })
  loyaltyEnabled: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 1.00 })
  loyaltyPointsPerCurrency: number;  // points per $ spent

  @Column('decimal', { precision: 5, scale: 2, default: 0.01 })
  loyaltyPointValue: number;         // $ value per point

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
