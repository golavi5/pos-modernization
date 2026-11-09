/** One row of `GET /inventory/stock`: a product and its stock (SPEC-BACK-007). */
export interface StockLevelDto {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  reorder_level: number;
}

export interface StockPageDto {
  data: StockLevelDto[];
  total: number;
  page: number;
  pageSize: number;
}
