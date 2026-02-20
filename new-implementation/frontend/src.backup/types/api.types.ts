export interface ApiResponse<T = any> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
  timestamp?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, any>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retry?: boolean;
  retryCount?: number;
}

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public data?: any,
    message?: string
  ) {
    super(message || `API Error: ${statusCode}`);
    this.name = 'ApiRequestError';
  }
}
