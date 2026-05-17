import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TMWeasyQRPaymentWebhook } from '../src/client';
import { TMWeasyValidationError } from '../src/errors';
import { CancelPayResponse } from '../src/types';

describe('TMWeasyQRPaymentWebhook - Automatic Cancellation Scheduler', () => {
  const config = {
    username: 'testuser',
    password: 'testpassword',
    conId: 'testconid',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should throw validation error if idPay is empty when scheduling auto-cancellation', () => {
    const client = new TMWeasyQRPaymentWebhook(config);
    expect(() => client.scheduleAutoCancel('', 10)).toThrow(TMWeasyValidationError);
  });

  it('should trigger cancelPay and call onSuccess callback when the scheduled delay expires', async () => {
    const mockResponse = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ status: 1, msg: 'Cancelled successfully' }),
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const client = new TMWeasyQRPaymentWebhook(config);
    
    let successCalled = false;
    let successResponse: CancelPayResponse | null = null;

    const handle = client.scheduleAutoCancel('754349', 60, {
      onSuccess: (res) => {
        successCalled = true;
        successResponse = res;
      },
    });

    expect(handle.hasFired()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    // Fast-forward virtual time by 60 seconds (60000ms)
    await vi.advanceTimersByTimeAsync(60000);

    expect(handle.hasFired()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(successCalled).toBe(true);
    expect(successResponse).not.toBeNull();
    expect(successResponse!.status).toBe(1);
    expect(successResponse!.msg).toBe('Cancelled successfully');
  });

  it('should not call cancelPay or callbacks if the timer is stopped before expiring', async () => {
    const mockResponse = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ status: 1 }),
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const client = new TMWeasyQRPaymentWebhook(config);
    
    let successCalled = false;
    const handle = client.scheduleAutoCancel('754349', 60, {
      onSuccess: () => {
        successCalled = true;
      },
    });

    // Stop the cancellation timer immediately before the time expires
    handle.stop();

    // Fast-forward past the 60s timeout
    await vi.advanceTimersByTimeAsync(60000);

    expect(handle.hasFired()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(successCalled).toBe(false);
  });

  it('should trigger onError callback if the cancellation request fails', async () => {
    const mockFailResponse = {
      status: 500,
      ok: false,
    };
    vi.mocked(fetch).mockResolvedValue(mockFailResponse as Response);

    const client = new TMWeasyQRPaymentWebhook(config);

    let errorCalled = false;
    let caughtError: Error | null = null;

    const handle = client.scheduleAutoCancel('754349', 10, {
      onError: (err) => {
        errorCalled = true;
        caughtError = err;
      },
    });

    // Fast-forward by 10 seconds
    await vi.advanceTimersByTimeAsync(10000);

    expect(handle.hasFired()).toBe(true);
    expect(errorCalled).toBe(true);
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('HTTP request failed');
  });
});
