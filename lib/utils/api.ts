/**
 * API client utilities and HTTP helpers
 */

/**
 * HTTP methods enum
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
} as const

/**
 * API response wrapper interface
 */
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success: boolean
  status: number
}

/**
 * API error class
 */
export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Request configuration interface
 */
export interface RequestConfig {
  method?: keyof typeof HTTP_METHODS
  headers?: Record<string, string>
  body?: any
  timeout?: number
  signal?: AbortSignal
}

/**
 * Generic API client function
 * @param url - API endpoint URL
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function apiClient<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    signal
  } = config

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Use provided signal or timeout controller
  const requestSignal = signal || controller.signal

  try {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: requestSignal
    }

    // Add body for POST/PUT/PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(url, requestOptions)

    clearTimeout(timeoutId)

    // Parse response
    let data: T | undefined
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = (await response.text()) as T
    }

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data && 'message' in data 
        ? (data as any).message 
        : `HTTP ${response.status}: ${response.statusText}`
      
      throw new ApiError(errorMessage, response.status)
    }

    return {
      data,
      success: true,
      status: response.status
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      return {
        error: error.message,
        success: false,
        status: error.status
      }
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        error: 'Request timeout',
        success: false,
        status: 408
      }
    }

    return {
      error: error instanceof Error ? error.message : 'Network error',
      success: false,
      status: 0
    }
  }
}

/**
 * GET request helper
 * @param url - API endpoint URL
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function get<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { ...config, method: 'GET' })
}

/**
 * POST request helper
 * @param url - API endpoint URL
 * @param body - Request body
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function post<T = any>(url: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { ...config, method: 'POST', body })
}

/**
 * PUT request helper
 * @param url - API endpoint URL
 * @param body - Request body
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function put<T = any>(url: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { ...config, method: 'PUT', body })
}

/**
 * PATCH request helper
 * @param url - API endpoint URL
 * @param body - Request body
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function patch<T = any>(url: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { ...config, method: 'PATCH', body })
}

/**
 * DELETE request helper
 * @param url - API endpoint URL
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function del<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return apiClient<T>(url, { ...config, method: 'DELETE' })
}

/**
 * Upload file helper
 * @param url - Upload endpoint URL
 * @param file - File to upload
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function uploadFile<T = any>(
  url: string,
  file: File,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient<T>(url, {
    ...config,
    method: 'POST',
    body: formData
  })
}

/**
 * Upload multiple files helper
 * @param url - Upload endpoint URL
 * @param files - Files to upload
 * @param fieldName - Form field name (default: 'files')
 * @param config - Request configuration
 * @returns Promise with API response
 */
export async function uploadFiles<T = any>(
  url: string,
  files: File[],
  fieldName: string = 'files',
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  const formData = new FormData()
  
  files.forEach((file, index) => {
    formData.append(`${fieldName}[${index}]`, file)
  })

  return apiClient<T>(url, {
    ...config,
    method: 'POST',
    body: formData
  })
}

/**
 * Create query string from object
 * @param params - Query parameters object
 * @returns Query string
 */
export function createQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  return searchParams.toString()
}

/**
 * Build URL with query parameters
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns Complete URL with query string
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params) return baseUrl
  
  const queryString = createQueryString(params)
  const separator = baseUrl.includes('?') ? '&' : '?'
  
  return queryString ? `${baseUrl}${separator}${queryString}` : baseUrl
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param retries - Number of retries (default: 3)
 * @param delay - Initial delay in milliseconds (default: 1000)
 * @returns Promise with function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return retry(fn, retries - 1, delay * 2) // Exponential backoff
    }
    throw error
  }
}

/**
 * Check if response is successful
 * @param response - API response
 * @returns True if successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined
}

/**
 * Extract error message from API response
 * @param response - API response
 * @returns Error message
 */
export function getErrorMessage<T>(response: ApiResponse<T>): string {
  return response.error || response.message || 'An unknown error occurred'
}

/**
 * Create API error from response
 * @param response - API response
 * @returns ApiError instance
 */
export function createApiError<T>(response: ApiResponse<T>): ApiError {
  return new ApiError(getErrorMessage(response), response.status)
}

/**
 * Handle API response with error handling
 * @param response - API response
 * @returns Data if successful, throws ApiError if not
 */
export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (isApiSuccess(response)) {
    return response.data
  }
  throw createApiError(response)
}

/**
 * Create authenticated request headers
 * @param token - Authentication token
 * @param additionalHeaders - Additional headers
 * @returns Headers object
 */
export function createAuthHeaders(
  token?: string,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}