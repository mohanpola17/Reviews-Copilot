import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  Review,
  IngestResponse,
  ReviewsListResponse,
  ReviewResponse,
  SuggestReplyResponse,
  AnalyticsResponse,
  SearchResponse,
  ProcessReviewsResponse,
  HealthCheckResponse,
  ReviewFilters,
  Pagination
} from '../types';

// Configuration
const API_BASE_URL: string = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_KEY: string = process.env.REACT_APP_API_KEY || 'demo-key-123';
const REQUEST_TIMEOUT: number = 30000; // 30 seconds
const MAX_RETRIES: number = 3;

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for logging and error handling
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add request timestamp for performance tracking
    (config as any).metadata = { startTime: new Date() };
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date().getTime() - ((response.config as any).metadata?.startTime?.getTime() || 0);
    
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Calculate request duration
    const duration = new Date().getTime() - ((originalRequest as any)?.metadata?.startTime?.getTime() || 0);
    
    // Log errors
    console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} (${duration}ms)`, {
      status: error.response?.status,
      message: (error.response?.data as any)?.detail || error.message,
      data: error.response?.data
    });
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access - check API key');
    } else if (error.response?.status === 503) {
      // Handle service unavailable
      console.warn('Service temporarily unavailable');
    } else if (error.code === 'ECONNABORTED') {
      // Handle timeout
      console.warn('Request timeout - server may be slow');
    }
    
    return Promise.reject(error);
  }
);

// Retry mechanism for failed requests
const retryRequest = async (config: AxiosRequestConfig, retryCount: number = 0): Promise<any> => {
  try {
    return await api(config);
  } catch (error: unknown) {
    if (retryCount < MAX_RETRIES && shouldRetry(error as AxiosError)) {
      console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return retryRequest(config, retryCount + 1);
    }
    throw error;
  }
};

// Determine if a request should be retried
const shouldRetry = (error: AxiosError) => {
  return (
    error.code === 'ECONNABORTED' || // Timeout
    (error.response?.status && error.response.status >= 500) || // Server errors
    error.response?.status === 429   // Rate limiting
  );
};

// Enhanced API service with retry logic and better error handling
export const reviewsAPI = {
  // Get reviews with filtering and pagination
  getReviews: async (params: Partial<ReviewFilters & Pagination> = {}): Promise<ReviewsListResponse> => {
    try {
      const response = await retryRequest({
        method: 'GET',
        url: '/reviews',
        params: {
          page: 1,
          page_size: 10,
          ...params
        }
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch reviews: ${errorMessage}`);
    }
  },

  // Get single review
  getReview: async (id: number): Promise<ReviewResponse> => {
    try {
      const response = await retryRequest({
        method: 'GET',
        url: `/reviews/${id}`
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status === 404) {
        throw new Error(`Review with ID ${id} not found`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch review: ${errorMessage}`);
    }
  },

  // Ingest reviews
  ingestReviews: async (reviews: Review[]): Promise<IngestResponse> => {
    try {
      // Validate input
      if (!Array.isArray(reviews) || reviews.length === 0) {
        throw new Error('Reviews array is required and cannot be empty');
      }

      const response = await retryRequest({
        method: 'POST',
        url: '/ingest',
        data: { reviews }
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to ingest reviews: ${errorMessage}`);
    }
  },

  // Suggest reply for a review
  suggestReply: async (id: number): Promise<SuggestReplyResponse> => {
    try {
      const response = await retryRequest({
        method: 'POST',
        url: `/reviews/${id}/suggest-reply`
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 404) {
          throw new Error(`Review with ID ${id} not found`);
        } else if (axiosError.response?.status === 503) {
          throw new Error('AI reply generation is currently unavailable');
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate reply: ${errorMessage}`);
    }
  },

  // Get analytics
  getAnalytics: async (): Promise<AnalyticsResponse> => {
    try {
      const response = await retryRequest({
        method: 'GET',
        url: '/analytics'
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 503) {
          throw new Error('Analytics are currently unavailable');
        }
        throw new Error(`Failed to fetch analytics: ${axiosError.response?.data?.detail || axiosError.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch analytics: ${errorMessage}`);
    }
  },

  // Search similar reviews
  searchSimilar: async (query: string, k: number = 5): Promise<SearchResponse> => {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const response = await retryRequest({
        method: 'GET',
        url: '/search',
        params: { q: query.trim(), k }
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 503) {
          throw new Error('Search functionality is currently unavailable');
        }
        throw new Error(`Failed to search reviews: ${axiosError.response?.data?.detail || axiosError.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to search reviews: ${errorMessage}`);
    }
  },

  // Process all reviews for AI analysis
  processReviews: async (): Promise<ProcessReviewsResponse> => {
    try {
      const response = await retryRequest({
        method: 'POST',
        url: '/process-reviews'
      });
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 503) {
          throw new Error('Batch processing is currently unavailable');
        }
        throw new Error(`Failed to process reviews: ${axiosError.response?.data?.detail || axiosError.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process reviews: ${errorMessage}`);
    }
  },

  // Health check
  healthCheck: async (): Promise<HealthCheckResponse> => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        throw new Error(`Health check failed: ${axiosError.response?.data?.detail || axiosError.message}`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Health check failed: ${errorMessage}`);
    }
  },

  // Utility methods
  isApiError: (error: unknown): error is AxiosError => {
    return error !== null && typeof error === 'object' && 'response' in error && (error as AxiosError).response?.status !== undefined && (error as AxiosError).response!.status >= 400;
  },

  getErrorMessage: (error: unknown): string => {
    if (reviewsAPI.isApiError(error)) {
      return (error.response?.data as any)?.detail || error.message || 'An error occurred';
    }
    return 'An unexpected error occurred';
  },

  getErrorStatus: (error: unknown): number | undefined => {
    if (reviewsAPI.isApiError(error)) {
      return error.response?.status;
    }
    return undefined;
  }
};

export default api;
