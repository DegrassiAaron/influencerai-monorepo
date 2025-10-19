/**
 * Custom hook for presigned URL expiry tracking
 *
 * Monitors presigned URL expiration and provides real-time status updates.
 * Automatically checks expiry every 60 seconds and calculates remaining time.
 *
 * @example
 * ```typescript
 * const artifact = { presignedUrl: '...', expiresAt: '2025-01-20T15:00:00Z' };
 * const { url, isExpired, minutesRemaining, needsRefresh } = usePresignedUrl(
 *   artifact.presignedUrl,
 *   artifact.expiresAt
 * );
 *
 * if (needsRefresh) {
 *   // Request new presigned URL
 *   onRequestRefresh(artifact.id);
 * }
 *
 * if (isExpired) {
 *   return <div>URL expired. Please refresh.</div>;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes } from 'date-fns';

/**
 * Return type for usePresignedUrl hook
 */
export interface PresignedUrlStatus {
  /** The presigned URL */
  url: string;

  /** Whether the URL has expired */
  isExpired: boolean;

  /** Minutes remaining until expiry (negative if expired) */
  minutesRemaining: number;

  /** Whether refresh should be requested (< 5 minutes remaining) */
  needsRefresh: boolean;
}

/**
 * Hook for tracking presigned URL expiry
 *
 * Monitors URL expiration in real-time with automatic refresh detection.
 * Updates every 60 seconds to provide current expiry status.
 *
 * @param url - Presigned URL to track
 * @param expiresAt - Expiration timestamp (ISO 8601 format)
 * @returns URL status with expiry information
 */
export function usePresignedUrl(url: string, expiresAt: string): PresignedUrlStatus {
  const [isExpired, setIsExpired] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(0);

  useEffect(() => {
    const expiryDate = parseISO(expiresAt);

    /**
     * Check if URL is expired and calculate remaining time
     */
    const checkExpiry = () => {
      const now = new Date();
      const remaining = differenceInMinutes(expiryDate, now);

      setMinutesRemaining(remaining);
      setIsExpired(remaining <= 0);
    };

    // Initial check
    checkExpiry();

    // Check every 60 seconds
    const interval = setInterval(checkExpiry, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    url,
    isExpired,
    minutesRemaining,
    needsRefresh: minutesRemaining < 5 && minutesRemaining > 0,
  };
}
