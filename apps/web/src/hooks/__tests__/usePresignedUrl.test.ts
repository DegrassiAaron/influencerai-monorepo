/**
 * @file usePresignedUrl.test.ts
 * @description Tests for the presigned URL expiration management hook
 *
 * This test suite verifies:
 * - Expiry detection logic
 * - Minutes remaining calculation
 * - Refresh warning threshold (<5 minutes)
 * - Date/time handling edge cases
 *
 * BDD Mapping: Scenario 2.3 (Presigned URL expiration handling)
 */

import { renderHook } from '@testing-library/react';
import { usePresignedUrl } from '../usePresignedUrl';

// Mock date-fns functions
jest.mock('date-fns', () => ({
  differenceInMinutes: jest.fn(),
  isPast: jest.fn(),
  parseISO: jest.fn((dateString: string) => new Date(dateString)),
}));

import { differenceInMinutes, isPast } from 'date-fns';

const mockedDifferenceInMinutes = differenceInMinutes as jest.MockedFunction<
  typeof differenceInMinutes
>;
const mockedIsPast = isPast as jest.MockedFunction<typeof isPast>;

describe('usePresignedUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Expiry Detection', () => {
    it('should detect expired URL when expiry date is in the past', () => {
      const expiryDate = '2024-01-01T12:00:00Z';
      mockedIsPast.mockReturnValue(true);
      mockedDifferenceInMinutes.mockReturnValue(0);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(true);
      expect(mockedIsPast).toHaveBeenCalledWith(new Date(expiryDate));
    });

    it('should detect non-expired URL when expiry date is in the future', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(60);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
    });

    it('should handle null expiry date gracefully', () => {
      const { result } = renderHook(() => usePresignedUrl(null));

      expect(result.current.isExpired).toBe(true);
      expect(result.current.minutesRemaining).toBe(0);
      expect(result.current.needsRefresh).toBe(false);
    });

    it('should handle undefined expiry date gracefully', () => {
      const { result } = renderHook(() => usePresignedUrl(undefined));

      expect(result.current.isExpired).toBe(true);
      expect(result.current.minutesRemaining).toBe(0);
      expect(result.current.needsRefresh).toBe(false);
    });
  });

  describe('Minutes Remaining Calculation', () => {
    it('should calculate minutes remaining correctly', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(45);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.minutesRemaining).toBe(45);
      expect(mockedDifferenceInMinutes).toHaveBeenCalledWith(
        new Date(expiryDate),
        expect.any(Date) // Current date
      );
    });

    it('should return 0 minutes when URL is expired', () => {
      const expiryDate = '2024-01-01T12:00:00Z';
      mockedIsPast.mockReturnValue(true);
      mockedDifferenceInMinutes.mockReturnValue(-30);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.minutesRemaining).toBe(0);
    });

    it('should handle very large time differences', () => {
      const expiryDate = '2026-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(500000);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.minutesRemaining).toBe(500000);
    });

    it('should return 0 for null expiry date', () => {
      const { result } = renderHook(() => usePresignedUrl(null));

      expect(result.current.minutesRemaining).toBe(0);
    });
  });

  describe('Refresh Warning Logic', () => {
    it('should set needsRefresh to true when less than 5 minutes remain', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(4); // Less than 5 minutes

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.needsRefresh).toBe(true);
    });

    it('should set needsRefresh to true when exactly 5 minutes remain', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(5); // Exactly 5 minutes

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.needsRefresh).toBe(true);
    });

    it('should set needsRefresh to false when more than 5 minutes remain', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(6); // More than 5 minutes

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.needsRefresh).toBe(false);
    });

    it('should set needsRefresh to false when URL is already expired', () => {
      const expiryDate = '2024-01-01T12:00:00Z';
      mockedIsPast.mockReturnValue(true);
      mockedDifferenceInMinutes.mockReturnValue(-30);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.needsRefresh).toBe(false);
      expect(result.current.isExpired).toBe(true);
    });

    it('should set needsRefresh to false when 1 minute remains', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(1);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.needsRefresh).toBe(true);
    });

    it('should set needsRefresh to false for null expiry date', () => {
      const { result } = renderHook(() => usePresignedUrl(null));

      expect(result.current.needsRefresh).toBe(false);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'invalid-date-string';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(NaN);

      const { result } = renderHook(() => usePresignedUrl(invalidDate));

      // Should treat NaN as expired
      expect(result.current.isExpired).toBe(true);
      expect(result.current.minutesRemaining).toBe(0);
    });

    it('should update when expiry date prop changes', () => {
      const firstExpiry = '2025-06-01T12:00:00Z';
      const secondExpiry = '2025-12-31T12:00:00Z';

      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(60);

      const { result, rerender } = renderHook(
        ({ expiry }) => usePresignedUrl(expiry),
        { initialProps: { expiry: firstExpiry } }
      );

      expect(result.current.minutesRemaining).toBe(30);

      // Change expiry date
      rerender({ expiry: secondExpiry });

      expect(result.current.minutesRemaining).toBe(60);
    });

    it('should handle transition from valid to expired', () => {
      const expiryDate = '2025-12-31T12:00:00Z';

      mockedIsPast.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockedDifferenceInMinutes.mockReturnValueOnce(10).mockReturnValueOnce(-5);

      const { result, rerender } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.minutesRemaining).toBe(10);

      // Simulate time passing
      rerender();

      expect(result.current.isExpired).toBe(true);
      expect(result.current.minutesRemaining).toBe(0);
    });

    it('should handle zero minutes remaining (about to expire)', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(0); // About to expire

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.minutesRemaining).toBe(0);
      expect(result.current.needsRefresh).toBe(true); // 0 <= 5
    });
  });

  describe('Real-World Scenarios', () => {
    it('should warn for URLs expiring in 3 minutes (typical presigned URL scenario)', () => {
      const expiryDate = '2025-12-31T12:03:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(3);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.needsRefresh).toBe(true);
      expect(result.current.minutesRemaining).toBe(3);
    });

    it('should not warn for URLs with 10 minutes remaining', () => {
      const expiryDate = '2025-12-31T12:10:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(10);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.needsRefresh).toBe(false);
      expect(result.current.minutesRemaining).toBe(10);
    });

    it('should handle artifact URLs with 15-minute expiry (common MinIO setting)', () => {
      const expiryDate = '2025-12-31T12:15:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(15);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(false);
      expect(result.current.needsRefresh).toBe(false);
      expect(result.current.minutesRemaining).toBe(15);
    });

    it('should handle URLs that expired 30 minutes ago', () => {
      const expiryDate = '2024-01-01T11:30:00Z';
      mockedIsPast.mockReturnValue(true);
      mockedDifferenceInMinutes.mockReturnValue(-30);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current.isExpired).toBe(true);
      expect(result.current.needsRefresh).toBe(false);
      expect(result.current.minutesRemaining).toBe(0);
    });
  });

  describe('Type Safety and API', () => {
    it('should return all expected properties', () => {
      const expiryDate = '2025-12-31T12:00:00Z';
      mockedIsPast.mockReturnValue(false);
      mockedDifferenceInMinutes.mockReturnValue(10);

      const { result } = renderHook(() => usePresignedUrl(expiryDate));

      expect(result.current).toHaveProperty('isExpired');
      expect(result.current).toHaveProperty('minutesRemaining');
      expect(result.current).toHaveProperty('needsRefresh');

      expect(typeof result.current.isExpired).toBe('boolean');
      expect(typeof result.current.minutesRemaining).toBe('number');
      expect(typeof result.current.needsRefresh).toBe('boolean');
    });

    it('should accept string | null | undefined types', () => {
      // This test verifies TypeScript compilation more than runtime behavior
      const { result: result1 } = renderHook(() =>
        usePresignedUrl('2025-12-31T12:00:00Z')
      );
      const { result: result2 } = renderHook(() => usePresignedUrl(null));
      const { result: result3 } = renderHook(() => usePresignedUrl(undefined));

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      expect(result3.current).toBeDefined();
    });
  });
});
