import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TMWeasyClient } from '../src/client';
import { TMWeasyValidationError, TMWeasyAPIError } from '../src/errors';

describe('TMWeasyClient', () => {
  const config = {
    username: 'testuser',
    password: 'testpassword',
    conId: 'testconid',
  };

  let client: TMWeasyClient;

  beforeEach(() => {
    client = new TMWeasyClient(config);
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('Constructor Validation', () => {
    it('should throw validation error if username is empty', () => {
      expect(() => new TMWeasyClient({ ...config, username: '' })).toThrow(TMWeasyValidationError);
    });

    it('should throw validation error if password is empty', () => {
      expect(() => new TMWeasyClient({ ...config, password: '' })).toThrow(TMWeasyValidationError);
    });

    it('should throw validation error if conId is empty', () => {
      expect(() => new TMWeasyClient({ ...config, conId: '' })).toThrow(TMWeasyValidationError);
    });
  });

  describe('Step 1: createPay', () => {
    const validOptions = {
      amount: 50,
      ref1: 'customer_123',
      ip: '127.0.0.1',
    };

    it('should successfully create a payment session', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 1, id_pay: '754349' }),
      } as Response);

      const response = await client.createPay(validOptions);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(1);
      expect(response.id_pay).toBe('754349');
      expect(response.msg).toBeUndefined();
    });

    it('should return error status and message if API returns status 0', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 0, msg: 'Invalid credentials' }),
      } as Response);

      const response = await client.createPay(validOptions);

      expect(response.status).toBe(0);
      expect(response.id_pay).toBeUndefined();
      expect(response.msg).toBe('Invalid credentials');
    });

    it('should throw validation error for float amounts', async () => {
      await expect(client.createPay({ ...validOptions, amount: 50.5 })).rejects.toThrow(
        'Amount must be an integer'
      );
    });

    it('should throw validation error for zero or negative amounts', async () => {
      await expect(client.createPay({ ...validOptions, amount: 0 })).rejects.toThrow(
        'Amount must be greater than zero'
      );
      await expect(client.createPay({ ...validOptions, amount: -10 })).rejects.toThrow(
        'Amount must be greater than zero'
      );
    });

    it('should throw validation error for missing ref1', async () => {
      await expect(client.createPay({ ...validOptions, ref1: '' })).rejects.toThrow(
        'ref1 (Customer Reference ID) is required'
      );
    });

    it('should throw validation error for missing ip', async () => {
      await expect(client.createPay({ ...validOptions, ip: '' })).rejects.toThrow(
        'Customer IP address is required'
      );
    });
  });

  describe('Step 2: detailPay', () => {
    const validOptions = {
      idPay: '754349',
      promptpayId: '0812345678',
      type: '01' as const,
    };

    it('should successfully get payment details and QR code', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            status: 1,
            ref1: 'customer_123',
            amount_check: '1901',
            qr_image_base64: 'data:image/png;base64,...',
            time_out: '300',
          }),
      } as Response);

      const response = await client.detailPay(validOptions);

      expect(response.status).toBe(1);
      expect(response.ref1).toBe('customer_123');
      expect(response.amount_check).toBe('1901');
      expect(response.amount_baht).toBe(19.01); // 1901 satang / 100
      expect(response.qr_image_base64).toBe('data:image/png;base64,...');
      expect(response.time_out).toBe(300);
    });

    it('should return error status and message if API returns status 0 in step 2', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: '0', msg: 'Payment session expired' }),
      } as Response);

      const response = await client.detailPay(validOptions);

      expect(response.status).toBe(0);
      expect(response.msg).toBe('Payment session expired');
    });

    it('should throw validation error if idPay is missing', async () => {
      await expect(client.detailPay({ ...validOptions, idPay: '' })).rejects.toThrow(
        'idPay is required'
      );
    });

    it('should throw validation error if PromptPay phone is invalid format', async () => {
      await expect(client.detailPay({ ...validOptions, promptpayId: '123' })).rejects.toThrow(
        'PromptPay Mobile number must be a numeric string between 10 and 15 digits'
      );
    });

    it('should throw validation error if PromptPay National ID is invalid length', async () => {
      await expect(
        client.detailPay({ ...validOptions, type: '02', promptpayId: '123456789012' })
      ).rejects.toThrow('PromptPay National ID must be a numeric string of exactly 13 digits');
    });
  });

  describe('Step 3: cancelPay', () => {
    it('should successfully cancel the payment', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 1, msg: 'Cancelled successfully' }),
      } as Response);

      const response = await client.cancelPay('754349');

      expect(response.status).toBe(1);
      expect(response.msg).toBe('Cancelled successfully');
    });

    it('should return failure status when API fails cancellation', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: 0, msg: 'Cannot cancel before timeout' }),
      } as Response);

      const response = await client.cancelPay('754349');

      expect(response.status).toBe(0);
      expect(response.msg).toBe('Cannot cancel before timeout');
    });
  });

  describe('HTTP error handling', () => {
    it('should throw TMWeasyAPIError on bad HTTP status', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(client.cancelPay('123')).rejects.toThrow(TMWeasyAPIError);
    });
  });
});
