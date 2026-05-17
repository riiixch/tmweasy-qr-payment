import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TMWeasyClient } from '../src/client';
import { TMWeasyAPIError } from '../src/errors';

describe('TMWeasyClient - Automatic Retry & Backoff', () => {
  const config = {
    username: 'testuser',
    password: 'testpassword',
    conId: 'testconid',
    retryOptions: {
      retries: 2,
      minTimeout: 100, // 100ms initial wait
      factor: 2,       // exponential backoff factor (100ms, then 200ms)
    },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should succeed on first try and not retry if connection is healthy', async () => {
    const mockResponse = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ status: 1, id_pay: '99999' }),
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const client = new TMWeasyClient(config);
    const result = await client.createPay({ amount: 10, ref1: 'test_ref', ip: '127.0.0.1' });

    expect(result.status).toBe(1);
    expect(result.id_pay).toBe('99999');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should retry on server failure and succeed if subsequent attempt works', async () => {
    const mockFail = {
      status: 503,
      ok: false,
    };
    const mockSuccess = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ status: 1, id_pay: '88888' }),
    };

    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(mockFail as Response) // 1st try: fail
      .mockResolvedValueOnce(mockSuccess as Response); // 2nd try: success

    const client = new TMWeasyClient(config);

    // Trigger payment creation
    const promise = client.createPay({ amount: 20, ref1: 'test_ref_2', ip: '127.0.0.1' });

    // Advance virtual timers to clear the 100ms retry backoff sleep
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;

    expect(result.status).toBe(1);
    expect(result.id_pay).toBe('88888');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should fail and throw TMWeasyAPIError after exhausting all retries', async () => {
    const mockFail = {
      status: 500,
      ok: false,
    };

    const fetchMock = vi.mocked(fetch).mockResolvedValue(mockFail as Response);

    const client = new TMWeasyClient(config);

    // Trigger payment creation
    const promise = client.createPay({ amount: 30, ref1: 'test_ref_3', ip: '127.0.0.1' });

    // Attach rejection expectation immediately to prevent unhandled rejection warnings
    const expectPromise = expect(promise).rejects.toThrow(TMWeasyAPIError);

    // Advance virtual timers to bypass retry 1 (100ms) and retry 2 (200ms)
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    await expectPromise;
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 original attempt + 2 retries
  });
});
