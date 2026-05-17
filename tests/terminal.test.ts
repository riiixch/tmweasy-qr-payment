import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TMWeasyQRPaymentWebhook } from '../src/client';
import { renderQRToConsole } from '../src/terminal';

describe('Terminal QR Code Rendering & EMVCo PromptPay Generator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRC16 & EMVCo Generator', () => {
    it('should calculate CRC16 CCITT correctly matching the ISO standard vector', () => {
      // Standard CCITT verification vector for input "123456789" is "29B1"
      const crc = TMWeasyQRPaymentWebhook.calculateCRC16('123456789');
      expect(crc).toBe('29B1');
    });

    it('should generate correct EMVCo payload for Mobile Phone PromptPay', () => {
      // PromptPay Mobile format with amount 1901 Satangs (19.01 Baht)
      const payload = TMWeasyQRPaymentWebhook.generatePromptPayPayload('0812345678', '01', 1901);
      
      expect(payload).toContain('000201'); // Version tag
      expect(payload).toContain('010212'); // Dynamic QR type
      expect(payload).toContain('0016A000000677010111'); // PromptPay AID
      expect(payload).toContain('01130066812345678'); // Phone formatted as 00 + country code (66) + local no
      expect(payload).toContain('5303764'); // Currency (THB - 764)
      expect(payload).toContain('540519.01'); // Amount tag (length 5, value 19.01)
      expect(payload).toContain('5802TH'); // Country tag (TH)
      expect(payload.length).toBe(83); // Total length must be 83 chars (79 payload + 4 CRC)
    });

    it('should generate correct EMVCo payload for National ID PromptPay', () => {
      // PromptPay National ID format with amount 5000 Satangs (50.00 Baht)
      const payload = TMWeasyQRPaymentWebhook.generatePromptPayPayload('1234567890123', '02', 5000);
      
      expect(payload).toContain('000201'); // Version
      expect(payload).toContain('010212'); // Dynamic
      expect(payload).toContain('0016A000000677010111'); // PromptPay AID
      expect(payload).toContain('02131234567890123'); // National ID tag 02
      expect(payload).toContain('540550.00'); // Amount tag (length 5, value 50.00)
      expect(payload.length).toBe(83); // Total length must be 83 chars (79 payload + 4 CRC)
    });
  });

  describe('renderQRToConsole', () => {
    it('should render successfully to terminal when qrcode package is present', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const payload = TMWeasyQRPaymentWebhook.generatePromptPayPayload('0812345678', '01', 1000);
      await expect(renderQRToConsole(payload)).resolves.not.toThrow();
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should throw validation error if payload is empty', async () => {
      await expect(renderQRToConsole('')).rejects.toThrow('Payload is required');
    });
  });
});
