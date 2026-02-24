import axios, { AxiosError } from "axios";
import AppError  from "./appError";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RateLimitInfo {
  retryAfter: number;
  blockedUntil: number;
}

/**
 * Centralized Slack API client with caching and rate limit handling
 */
class SlackApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly USERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for users list

  /**
   * Generate cache key for a Slack API call
   */
  private getCacheKey(endpoint: string, botToken: string): string {
    // Use last 8 chars of token to differentiate workspaces
    const tokenHash = botToken.slice(-8);
    return `${endpoint}:${tokenHash}`;
  }

  /**
   * Check if we're currently rate limited for this token
   * Returns the seconds remaining if rate limited, 0 otherwise
   */
  private isRateLimited(botToken: string): number {
    const rateLimitKey = `ratelimit:${botToken.slice(-8)}`;
    const info = this.rateLimitInfo.get(rateLimitKey);

    if (!info) return 0;

    const now = Date.now();
    if (now < info.blockedUntil) {
      const secondsRemaining = Math.ceil((info.blockedUntil - now) / 1000);
      return secondsRemaining;
    }

    // Rate limit expired, clear it
    this.rateLimitInfo.delete(rateLimitKey);
    return 0;
  }

  /**
   * Mark token as rate limited
   */
  private setRateLimited(botToken: string, retryAfter: number): void {
    const rateLimitKey = `ratelimit:${botToken.slice(-8)}`;
    this.rateLimitInfo.set(rateLimitKey, {
      retryAfter,
      blockedUntil: Date.now() + retryAfter * 1000,
    });
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Fetch Slack users list with caching and rate limit handling
   */
  async getUsersList(botToken: string): Promise<any> {
    const endpoint = "users.list";
    const cacheKey = this.getCacheKey(endpoint, botToken);

    // Check rate limit first
    const rateLimitSeconds = this.isRateLimited(botToken);
    if (rateLimitSeconds > 0) {
      // If rate limited, try to return cached data even if slightly expired
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      const minutes = Math.ceil(rateLimitSeconds / 60);
      const timeStr =
        minutes > 1 ? `${minutes} minutes` : `${rateLimitSeconds} seconds`;
      throw new AppError(
        `Slack API rate limit exceeded. Please try again in ${timeStr}.`,
        429,
      );
    }

    // Check cache
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Make API call
    try {
      const response = await axios.get("https://slack.com/api/users.list", {
        headers: {
          Authorization: `Bearer ${botToken}`,
        },
      });

      if (!response.data.ok) {
        throw new AppError(`Slack API error: ${response.data.error}`, 500);
      }

      // Cache the successful response
      this.setCache(cacheKey, response.data, this.USERS_CACHE_TTL);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;

        // Handle rate limiting
        if (axiosError.response?.status === 429) {
          const retryAfter = parseInt(
            axiosError.response.headers["retry-after"] || "60",
          );
          this.setRateLimited(botToken, retryAfter);

          // Try to return cached data if available
          const cached = this.cache.get(cacheKey);
          if (cached) {
            return cached.data;
          }

          const minutes = Math.ceil(retryAfter / 60);
          const timeStr =
            minutes > 1 ? `${minutes} minutes` : `${retryAfter} seconds`;
          throw new AppError(
            `Slack API rate limit exceeded. Please try again in ${timeStr}.`,
            429,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Generic Slack API call with caching
   */
  async get<T = any>(
    endpoint: string,
    botToken: string,
    ttl: number = this.DEFAULT_CACHE_TTL,
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, botToken);

    // Check rate limit
    const rateLimitSeconds = this.isRateLimited(botToken);
    if (rateLimitSeconds > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      const minutes = Math.ceil(rateLimitSeconds / 60);
      const timeStr =
        minutes > 1 ? `${minutes} minutes` : `${rateLimitSeconds} seconds`;
      throw new AppError(
        `Slack API rate limit exceeded. Please try again in ${timeStr}.`,
        429,
      );
    }

    // Check cache
    const cached = this.getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Make API call
    try {
      const response = await axios.get(`https://slack.com/api/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${botToken}`,
        },
      });

      if (!response.data.ok) {
        throw new AppError(`Slack API error: ${response.data.error}`, 500);
      }

      this.setCache(cacheKey, response.data, ttl);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;

        if (axiosError.response?.status === 429) {
          const retryAfter = parseInt(
            axiosError.response.headers["retry-after"] || "60",
          );
          this.setRateLimited(botToken, retryAfter);

          const cached = this.cache.get(cacheKey);
          if (cached) {
            return cached.data;
          }

          const minutes = Math.ceil(retryAfter / 60);
          const timeStr =
            minutes > 1 ? `${minutes} minutes` : `${retryAfter} seconds`;
          throw new AppError(
            `Slack API rate limit exceeded. Please try again in ${timeStr}.`,
            429,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Clear cache for a specific workspace
   */
  clearCache(botToken: string): void {
    const tokenHash = botToken.slice(-8);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.includes(tokenHash)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.rateLimitInfo.clear();
  }
}

// Export singleton instance
export const slackApiCache = new SlackApiCache();
