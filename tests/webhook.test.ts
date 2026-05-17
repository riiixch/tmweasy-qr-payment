import { describe, it, expect } from 'vitest';
import { TMWeasyWebhook } from '../src/webhook';
import { TMWeasyValidationError, TMWeasySignatureError } from '../src/errors';
import { WebhookPayload } from '../src/types';

describe('TMWeasyWebhook', () => {
  const apiKey = 'test_api_key_123';
  const rawData = '{"id_pay":"754349","ref1":"testpay","amount_check":"1901","amount":"19.00","date_pay":"2024-07-29 14:14"}';
  
  // md5("{"id_pay":"754349","ref1":"testpay","amount_check":"1901","amount":"19.00","date_pay":"2024-07-29 14:14"}:test_api_key_123")
  // = md5('{"id_pay":"754349","ref1":"testpay","amount_check":"1901","amount":"19.00","date_pay":"2024-07-29 14:14"}:test_api_key_123')
  // We will compute the expected hash for this specific string:
  // Let's check the hash programmatically inside the test or verify it.
  const calculatedSignature = TMWeasyWebhook.calculateSignature(rawData, apiKey);

  describe('Signature Calculation and Verification', () => {
    it('should calculate MD5 signature successfully', () => {
      expect(calculatedSignature).toBeDefined();
      expect(calculatedSignature.length).toBe(32); // Hex MD5 is 32 chars
    });

    it('should verify correct signature as true', () => {
      const isValid = TMWeasyWebhook.verifySignature(rawData, calculatedSignature, apiKey);
      expect(isValid).toBe(true);
    });

    it('should verify incorrect signature as false', () => {
      const isValid = TMWeasyWebhook.verifySignature(rawData, 'wrong_signature', apiKey);
      expect(isValid).toBe(false);
    });
  });

  describe('verifyAndParse', () => {
    it('should verify and parse webhook data string correctly', () => {
      const payload: WebhookPayload = {
        data: rawData,
        signature: calculatedSignature,
      };

      const result = TMWeasyWebhook.verifyAndParse(payload, apiKey);

      expect(result.id_pay).toBe('754349');
      expect(result.ref1).toBe('testpay');
      expect(result.amount_check).toBe('1901');
      expect(result.amount).toBe('19.00');
      expect(result.amount_baht).toBe(19.01); // Helper float Baht
      expect(result.date_pay).toBe('2024-07-29 14:14');
    });

    it('should throw TMWeasySignatureError on invalid signature', () => {
      const payload: WebhookPayload = {
        data: rawData,
        signature: 'invalid_sig',
      };

      expect(() => TMWeasyWebhook.verifyAndParse(payload, apiKey)).toThrow(TMWeasySignatureError);
    });

    it('should throw TMWeasyValidationError if data is invalid JSON', () => {
      const payload: WebhookPayload = {
        data: '{invalid_json',
        signature: calculatedSignature,
      };

      expect(() => TMWeasyWebhook.verifyAndParse(payload, apiKey)).toThrow(TMWeasyValidationError);
    });

    it('should handle already-parsed object data (e.g. from express.json()) using fallback key sorting', () => {
      // Re-create the object representational form
      const parsedObject = JSON.parse(rawData) as Record<string, unknown>;

      // If keys are sorted differently, JSON.stringify(parsedObject) might differ.
      // But verifyAndParse will sort and attempt secondary verification
      const payload: WebhookPayload = {
        // Cast object as string for the payload type, but physically pass the object
        data: parsedObject as unknown as string,
        signature: calculatedSignature,
      };

      const result = TMWeasyWebhook.verifyAndParse(payload, apiKey);
      expect(result.id_pay).toBe('754349');
      expect(result.amount_baht).toBe(19.01);
    });
  });
});
