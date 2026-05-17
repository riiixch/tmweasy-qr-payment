import { TMWeasyConfig, CreatePayOptions, CreatePayResponse, DetailPayOptions, DetailPayResponse, CancelPayResponse } from './types';
import { TMWeasyValidationError, TMWeasyAPIError } from './errors';

/**
 * Client class to interact with TMWeasy PromptPay Webhook API
 */
export class TMWeasyClient {
  private readonly username: string;
  private readonly password: string;
  private readonly conId: string;
  private readonly baseUrl: string;
  private readonly retryOptions: {
    retries: number;
    minTimeout: number;
    factor: number;
  };

  /**
   * Initialize a new TMWeasyClient
   * @param config Configuration options
   */
  constructor(config: TMWeasyConfig) {
    if (!config.username || typeof config.username !== 'string' || config.username.trim() === '') {
      throw new TMWeasyValidationError('Username is required and must be a non-empty string', 'username');
    }
    if (!config.password || typeof config.password !== 'string' || config.password.trim() === '') {
      throw new TMWeasyValidationError('Password is required and must be a non-empty string', 'password');
    }
    if (!config.conId || typeof config.conId !== 'string' || config.conId.trim() === '') {
      throw new TMWeasyValidationError('Connection ID (conId) is required and must be a non-empty string', 'conId');
    }

    this.username = config.username.trim();
    this.password = config.password.trim();
    this.conId = config.conId.trim();
    this.baseUrl = config.baseUrl || 'http://tmwallet.thaighost.net/api_pph.php';
    this.retryOptions = {
      retries: config.retryOptions?.retries ?? 0,
      minTimeout: config.retryOptions?.minTimeout ?? 1000,
      factor: config.retryOptions?.factor ?? 2,
    };
  }

  /**
   * Helper to perform GET requests to the TMWeasy API with retry and backoff logic
   */
  private async request<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl);
    
    // Add common authentication and connection params
    url.searchParams.append('username', this.username);
    url.searchParams.append('password', this.password);
    url.searchParams.append('con_id', this.conId);

    // Add endpoint-specific params
    Object.entries(params).forEach(([key, val]) => {
      url.searchParams.append(key, val);
    });

    const { retries, minTimeout, factor } = this.retryOptions;
    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TMWeasy-QR-Payment-Webhook-SDK/1.0.0'
          }
        });

        if (!response.ok) {
          throw new TMWeasyAPIError(`HTTP request failed with status: ${response.status}`, undefined, response.status);
        }

        const rawText = await response.text();
        
        let parsedData: unknown;
        try {
          parsedData = JSON.parse(rawText);
        } catch (parseError) {
          throw new TMWeasyAPIError('Failed to parse API response as JSON', undefined, rawText);
        }

        return parsedData as T;
      } catch (error) {
        if (attempt < retries && !(error instanceof TMWeasyValidationError)) {
          attempt++;
          const delay = minTimeout * Math.pow(factor, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (error instanceof TMWeasyAPIError || error instanceof TMWeasyValidationError) {
          throw error;
        }
        throw new TMWeasyAPIError(`Network or request error: ${(error as Error).message}`, undefined, error);
      }
    }
  }

  /**
   * Calculate CRC16 CCITT checksum (polynomial 0x1021, initial value 0xFFFF, no reflection)
   * Standard algorithm used for EMVCo QR Codes (PromptPay, SGQR, etc.)
   * @param data The input string to compute CRC for
   * @returns 4-digit hexadecimal CRC checksum in uppercase
   */
  public static calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      crc ^= (charCode << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Generate a standard EMVCo PromptPay QR Code payload string
   * @param promptpayId PromptPay ID (Phone number or National ID)
   * @param type PromptPay type ('01' = phone, '02' = National ID)
   * @param amountSatang The transaction amount in Satangs
   * @returns EMVCo string payload (e.g. 000201010212...)
   */
  public static generatePromptPayPayload(promptpayId: string, type: '01' | '02', amountSatang: number): string {
    const cleanId = promptpayId.trim();
    
    let formattedId = '';
    if (type === '01') {
      // Phone format: remove leading 0, prepend 66, pad to 13 digits with leading 00
      let phoneNo = cleanId;
      if (phoneNo.startsWith('0')) {
        phoneNo = '66' + phoneNo.slice(1);
      }
      formattedId = '00' + phoneNo;
    } else {
      // National ID
      formattedId = cleanId;
    }

    const aidTag = '0016A000000677010111';
    const idTag = `${type}13${formattedId}`;
    const merchantInfoValue = aidTag + idTag;
    const merchantInfoTag = `29${merchantInfoValue.length.toString().padStart(2, '0')}${merchantInfoValue}`;

    const amountString = (amountSatang / 100).toFixed(2);
    const amountTag = `54${amountString.length.toString().padStart(2, '0')}${amountString}`;

    const rawPayload = `000201010212${merchantInfoTag}5303764${amountTag}5802TH6304`;
    const crc = this.calculateCRC16(rawPayload);

    return rawPayload + crc;
  }

  /**
   * Step 1: Create a payment session
   * @param options Payment session details
   * @returns Payment response containing payment ID
   */
  public async createPay(options: CreatePayOptions): Promise<CreatePayResponse> {
    // 1. Amount validation: Must be a positive integer
    if (typeof options.amount !== 'number' || isNaN(options.amount)) {
      throw new TMWeasyValidationError('Amount must be a valid number', 'amount');
    }
    if (!Number.isInteger(options.amount)) {
      throw new TMWeasyValidationError('Amount must be an integer (decimal points are not allowed)', 'amount');
    }
    if (options.amount <= 0) {
      throw new TMWeasyValidationError('Amount must be greater than zero', 'amount');
    }

    // 2. Ref1 validation: Must be a non-empty string
    if (!options.ref1 || typeof options.ref1 !== 'string' || options.ref1.trim() === '') {
      throw new TMWeasyValidationError('ref1 (Customer Reference ID) is required and must be a non-empty string', 'ref1');
    }

    // 3. IP validation: Must be a non-empty string
    if (!options.ip || typeof options.ip !== 'string' || options.ip.trim() === '') {
      throw new TMWeasyValidationError('Customer IP address is required and must be a non-empty string', 'ip');
    }

    interface RawCreatePayResponse {
      status: number | string;
      id_pay?: string | number;
      msg?: string;
    }

    const rawResponse = await this.request<RawCreatePayResponse>({
      amount: String(options.amount),
      ref1: options.ref1.trim(),
      ip: options.ip.trim(),
      method: 'create_pay'
    });

    const statusValue = Number(rawResponse.status) === 1 ? 1 : 0;

    const response: CreatePayResponse = {
      status: statusValue
    };

    if (statusValue === 1 && rawResponse.id_pay !== undefined) {
      response.id_pay = String(rawResponse.id_pay);
    } else {
      response.msg = rawResponse.msg || 'Unknown API Error occurred';
    }

    return response;
  }

  /**
   * Step 2: Fetch payment details and QR code image
   * @param options Details and PromptPay configurations
   * @returns Base64 QR code and transaction details
   */
  public async detailPay(options: DetailPayOptions): Promise<DetailPayResponse> {
    // 1. Payment ID validation
    if (options.idPay === undefined || options.idPay === null || String(options.idPay).trim() === '') {
      throw new TMWeasyValidationError('idPay is required', 'idPay');
    }

    // 2. PromptPay Type validation
    if (options.type !== '01' && options.type !== '02') {
      throw new TMWeasyValidationError('PromptPay type must be "01" (phone number) or "02" (National ID Card)', 'type');
    }

    // 3. PromptPay ID validation
    if (!options.promptpayId || typeof options.promptpayId !== 'string' || options.promptpayId.trim() === '') {
      throw new TMWeasyValidationError('PromptPay ID is required and must be a non-empty string', 'promptpayId');
    }

    const cleanPromptPayId = options.promptpayId.trim();

    if (options.type === '01') {
      // Must be numeric and 10 to 15 digits
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(cleanPromptPayId)) {
        throw new TMWeasyValidationError('PromptPay Mobile number must be a numeric string between 10 and 15 digits', 'promptpayId');
      }
    } else {
      // Must be numeric and exactly 13 digits
      const idRegex = /^[0-9]{13}$/;
      if (!idRegex.test(cleanPromptPayId)) {
        throw new TMWeasyValidationError('PromptPay National ID must be a numeric string of exactly 13 digits', 'promptpayId');
      }
    }

    interface RawDetailPayResponse {
      status: number | string;
      ref1?: string;
      amount_check?: string | number;
      qr_image_base64?: string;
      time_out?: string | number;
      msg?: string;
    }

    const rawResponse = await this.request<RawDetailPayResponse>({
      id_pay: String(options.idPay).trim(),
      promptpay_id: cleanPromptPayId,
      type: options.type,
      method: 'detail_pay'
    });

    const statusValue = Number(rawResponse.status) === 1 ? 1 : 0;

    const response: DetailPayResponse = {
      status: statusValue
    };

    if (statusValue === 1) {
      response.ref1 = rawResponse.ref1;
      
      let amountSatangVal = 0;
      if (rawResponse.amount_check !== undefined) {
        response.amount_check = String(rawResponse.amount_check);
        // Expose a helper float amount in Baht (converting Satang to Baht)
        const satang = Number(rawResponse.amount_check);
        if (!isNaN(satang)) {
          response.amount_baht = satang / 100;
          amountSatangVal = satang;
        }
      }

      response.qr_image_base64 = rawResponse.qr_image_base64;
      
      if (rawResponse.time_out !== undefined) {
        response.time_out = Number(rawResponse.time_out);
      }

      // Generate the standard EMVCo PromptPay payload if we have the amount
      if (amountSatangVal > 0) {
        try {
          response.promptpay_payload = TMWeasyClient.generatePromptPayPayload(
            cleanPromptPayId,
            options.type,
            amountSatangVal
          );
        } catch {
          // Fallback silently if generation fails
        }
      }
    } else {
      response.msg = rawResponse.msg || 'Unknown API Error occurred';
    }

    return response;
  }

  /**
   * Cancel a payment ID
   * Note: The payment ID can only be cancelled after the remaining payment duration (time_out) has expired (becomes negative).
   * @param idPay The payment ID to cancel
   */
  public async cancelPay(idPay: string | number): Promise<CancelPayResponse> {
    if (idPay === undefined || idPay === null || String(idPay).trim() === '') {
      throw new TMWeasyValidationError('idPay is required', 'idPay');
    }

    interface RawCancelPayResponse {
      status: number | string;
      msg?: string;
    }

    const rawResponse = await this.request<RawCancelPayResponse>({
      id_pay: String(idPay).trim(),
      method: 'cancel'
    });

    const statusValue = Number(rawResponse.status) === 1 ? 1 : 0;

    return {
      status: statusValue,
      msg: rawResponse.msg
    };
  }
}
