import { API_BASE_URL, API_TIMEOUT, HTTP_STATUS } from '@/utils/constants';
import { ApiResponse, ApiError, ApiRequestError, HttpClientConfig, RequestConfig } from '@/types/api.types';
import { storage } from './storage';
import { retryAsync } from '@/utils/helpers';

/**
 * HTTP Client for API requests with token management
 */
class HttpClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config?: HttpClientConfig) {
    this.baseURL = config?.baseURL || API_BASE_URL;
    this.timeout = config?.timeout || API_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };
  }

  /**
   * Get full URL for endpoint
   */
  private getUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) return endpoint;
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Get headers with authentication token
   */
  private getHeaders(config?: RequestConfig): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...config?.headers };
    const accessToken = storage.getAccessToken();

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiRequestError(
        response.status,
        data,
        data?.message || data || 'Request failed'
      );
    }

    return data as T;
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): ApiError {
    if (error instanceof ApiRequestError) {
      // Handle 401 Unauthorized - Token might be expired
      if (error.statusCode === HTTP_STATUS.UNAUTHORIZED) {
        storage.clearAuth();
        window.location.href = '/login';
      }

      return {
        message: error.message,
        statusCode: error.statusCode,
        details: error.data,
      };
    }

    if (error instanceof TypeError) {
      return {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      };
    }

    return {
      message: 'An unknown error occurred',
      statusCode: 500,
    };
  }

  /**
   * Make GET request
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.getUrl(endpoint);
    const headers = this.getHeaders(config);
    const queryString = config?.params ? this.buildQueryString(config.params) : '';
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const fetchOptions: RequestInit = {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    const response = await fetch(fullUrl, fetchOptions);
    return this.handleResponse<T>(response);
  }

  /**
   * Make POST request
   */
  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.getUrl(endpoint);
    const headers = this.getHeaders(config);

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    };

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  /**
   * Make PUT request
   */
  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.getUrl(endpoint);
    const headers = this.getHeaders(config);

    const fetchOptions: RequestInit = {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    };

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  /**
   * Make PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const url = this.getUrl(endpoint);
    const headers = this.getHeaders(config);

    const fetchOptions: RequestInit = {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    };

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.getUrl(endpoint);
    const headers = this.getHeaders(config);

    const fetchOptions: RequestInit = {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: Record<string, any>): string {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((v) => query.append(key, String(v)));
        } else {
          query.append(key, String(value));
        }
      }
    });

    return query.toString();
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Update base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }
}

// Create singleton instance
export const apiClient = new HttpClient();

/**
 * API service - Wrapper around HTTP client with retry logic and error handling
 */
export class ApiService {
  constructor(private http: HttpClient = apiClient) {}

  /**
   * Fetch with retry
   */
  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    config?: RequestConfig
  ): Promise<T> {
    const shouldRetry = config?.retry !== false;
    const retryCount = config?.retryCount ?? 3;

    if (!shouldRetry) {
      return fn();
    }

    try {
      return await retryAsync(fn, retryCount, 1000);
    } catch (error) {
      throw this.http['handleError'](error);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.fetchWithRetry(() => this.http.get<ApiResponse<T>>(endpoint, config), config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.fetchWithRetry(() => this.http.post<ApiResponse<T>>(endpoint, data, config), config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.fetchWithRetry(() => this.http.put<ApiResponse<T>>(endpoint, data, config), config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.fetchWithRetry(() => this.http.patch<ApiResponse<T>>(endpoint, data, config), config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.fetchWithRetry(() => this.http.delete<ApiResponse<T>>(endpoint, config), config);
  }
}

export const api = new ApiService();
