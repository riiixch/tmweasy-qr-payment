import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TMWeasyQRPayment } from '../src/direct';
import { TMWeasyValidationError, TMWeasyAPIError } from '../src/errors';
import { CancelPayResponse } from '../src/types';

describe('TMWeasyQRPayment (Direct Bank API)', () => {
  const config = {
    username: 'directuser',
    password: 'directpassword',
    conId: 'directconid',
    accode: 'bankaccode123',
    accountNo: '0123456789', // exactly 10 digits
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Constructor Validation', () => {
    it('should throw validation error if username is empty', () => {
      expect(() => new TMWeasyQRPayment({ ...config, username: '' })).toThrow(TMWeasyValidationError);
    });

    it('should throw validation error if password is empty', () => {
      expect(() => new TMWeasyQRPayment({ ...config, password: '' })).toThrow(TMWeasyValidationError);
    });

    it('should throw validation error if conId is empty', () => {
      expect(() => new TMWeasyQRPayment({ ...config, conId: '' })).toThrow(TMWeasyValidationError);
    });

    it('should initialize successfully with valid config parameters', () => {
      const client = new TMWeasyQRPayment(config);
      expect(client).toBeDefined();
    });
  });

  describe('Step 1: createPay', () => {
    const validOptions = {
      amount: 100,
      ref1: 'direct_ref_123',
      ip: '127.0.0.1',
    };

    it('should successfully create a payment session via apipp.php', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 1, id_pay: '100050' }),
      } as Response);

      const client = new TMWeasyQRPayment(config);
      const result = await client.createPay(validOptions);

      expect(result.status).toBe(1);
      expect(result.id_pay).toBe('100050');
      expect(fetch).toHaveBeenCalled();

      // Check request URL components
      const requestedUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(requestedUrl).toContain('https://tmwallet.thaighost.net/apipp.php');
      expect(requestedUrl).toContain('method=create_pay');
      expect(requestedUrl).toContain('amount=100');
      expect(requestedUrl).toContain('ref1=direct_ref_123');
    });

    it('should throw validation error if amount is negative or non-integer', async () => {
      const client = new TMWeasyQRPayment(config);
      await expect(client.createPay({ ...validOptions, amount: -10 })).rejects.toThrow('Amount must be greater than zero');
      await expect(client.createPay({ ...validOptions, amount: 15.5 })).rejects.toThrow('Amount must be an integer');
    });

    it('should throw validation error if ref1 is empty', async () => {
      const client = new TMWeasyQRPayment(config);
      await expect(client.createPay({ ...validOptions, ref1: '' })).rejects.toThrow('ref1');
    });
  });

  describe('Step 2: detailPay (with E-Wallet type 03 Support)', () => {
    const validOptions = {
      idPay: '100050',
      promptpayId: '0812345678',
      type: '01' as const, // mobile phone
    };

    it('should successfully get payment details and QR code image', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          status: 1,
          ref1: 'direct_ref_123',
          amount_check: '2500', // 25.00 Baht
          qr_image_base64: 'data:image/png;base64,xxxx',
          time_out: 420
        }),
      } as Response);

      const client = new TMWeasyQRPayment(config);
      const result = await client.detailPay(validOptions);

      expect(result.status).toBe(1);
      expect(result.ref1).toBe('direct_ref_123');
      expect(result.amount_check).toBe('2500');
      expect(result.amount_baht).toBe(25);
      expect(result.qr_image_base64).toBe('data:image/png;base64,xxxx');
      expect(result.time_out).toBe(420);
      expect(result.promptpay_payload).toBeDefined();
    });

    it('should successfully support E-Wallet type 03 PromptPay IDs', async () => {
      // Standard KBANK/SCB E-Wallet ID is usually 15 digits
      const ewalletId = '140001234567890';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          status: 1,
          ref1: 'direct_ref_123',
          amount_check: '10000', // 100.00 Baht
          qr_image_base64: 'data:image/png;base64,xxxx',
          time_out: 500
        }),
      } as Response);

      const client = new TMWeasyQRPayment(config);
      const result = await client.detailPay({
        idPay: '100050',
        promptpayId: ewalletId,
        type: '03'
      });

      expect(result.status).toBe(1);
      expect(result.promptpay_payload).toBeDefined();
      
      // Verify standard E-Wallet AID Tag presence (A000000677010112)
      expect(result.promptpay_payload).toContain('0016A000000677010112');
      // E-Wallet data tag should contain '0315' and the formatted ID
      expect(result.promptpay_payload).toContain(`0315${ewalletId}`);
    });

    it('should throw validation error if E-Wallet ID is non-numeric or invalid length', async () => {
      const client = new TMWeasyQRPayment(config);
      await expect(client.detailPay({
        idPay: '100050',
        promptpayId: 'abc1234567890',
        type: '03'
      })).rejects.toThrow('PromptPay E-Wallet ID must be a numeric string between 10 and 20 digits');

      await expect(client.detailPay({
        idPay: '100050',
        promptpayId: '123', // too short
        type: '03'
      })).rejects.toThrow('PromptPay E-Wallet ID must be a numeric string between 10 and 20 digits');
    });
  });

  describe('Step 3: confirmPay (Direct Bank API Verification)', () => {
    const confirmOptions = {
      idPay: '100050',
      ip: '192.168.1.50',
    };

    it('should successfully confirm payment directly using configured accode & accountNo', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          status: 1,
          ref1: 'direct_ref_123',
          amount: '25.00',
          date_pay: '2026-05-17 21:00'
        }),
      } as Response);

      const client = new TMWeasyQRPayment(config);
      const result = await client.confirmPay(confirmOptions);

      expect(result.status).toBe(1);
      expect(result.ref1).toBe('direct_ref_123');
      expect(result.amount).toBe(25);
      expect(result.date_pay).toBe('2026-05-17 21:00');

      const requestedUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(requestedUrl).toContain('method=confirm');
      expect(requestedUrl).toContain('accode=bankaccode123');
      expect(requestedUrl).toContain('account_no=0123456789');
      expect(requestedUrl).toContain('ip=192.168.1.50');
      expect(requestedUrl).toContain('id_pay=100050');
    });

    it('should allow options to override global accode and accountNo', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 1 }),
      } as Response);

      const client = new TMWeasyQRPayment(config);
      await client.confirmPay({
        ...confirmOptions,
        accode: 'customaccode999',
        accountNo: '9876543210'
      });

      const requestedUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(requestedUrl).toContain('accode=customaccode999');
      expect(requestedUrl).toContain('account_no=9876543210');
    });

    it('should throw validation error if accountNo is not exactly 10 digits', async () => {
      const client = new TMWeasyQRPayment(config);
      await expect(client.confirmPay({
        ...confirmOptions,
        accountNo: '123456789' // only 9 digits
      })).rejects.toThrow('accountNo must be a numeric string of exactly 10 digits');
    });

    it('should successfully confirm payment without accode and not include accode in query parameters', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 1 }),
      } as Response);

      const clientWithoutAccode = new TMWeasyQRPayment({
        username: 'user',
        password: 'pwd',
        conId: 'con',
        accountNo: '0123456789'
      });
      await clientWithoutAccode.confirmPay(confirmOptions);

      const requestedUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(requestedUrl).not.toContain('accode=');
    });
  });

  describe('Automatic Cancellation Scheduler', () => {
    it('should trigger cancelPay and call onSuccess callback when scheduled delay expires', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ status: 1, msg: 'Cancelled successfully' }),
      };
      const fetchMock = vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

      const client = new TMWeasyQRPayment(config);
      
      let successCalled = false;
      let successResponse: CancelPayResponse | null = null;

      const handle = client.scheduleAutoCancel('100050', 30, {
        onSuccess: (res) => {
          successCalled = true;
          successResponse = res;
        },
      });

      expect(handle.hasFired()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();

      // Fast-forward virtual time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      expect(handle.hasFired()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(successCalled).toBe(true);
      expect(successResponse!.status).toBe(1);
    });
  });
});
