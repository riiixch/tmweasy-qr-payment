/**
 * Render an EMVCo PromptPay payload as a beautiful ANSI QR Code in the terminal.
 * 
 * > [!NOTE]
 * > This feature requires the optional peer dependency 'qrcode' to be installed.
 * > To use this, please run: `npm install qrcode`
 * 
 * @param payload The EMVCo PromptPay payload string (e.g. 000201010212...)
 */
export async function renderQRToConsole(payload: string): Promise<void> {
  if (!payload || typeof payload !== 'string' || payload.trim() === '') {
    throw new Error('Payload is required to render QR code');
  }

  // Purely-typed interface for the dynamic import to enforce no 'any'
  interface QRCodeModule {
    toString(
      text: string,
      options?: {
        type?: 'terminal' | 'utf8' | 'svg' | 'txt';
        small?: boolean;
      }
    ): Promise<string>;
  }

  let qrcodeImport: unknown;
  try {
    // Dynamic import to keep the core package free of external dependencies
    qrcodeImport = await import('qrcode');
  } catch (err) {
    console.error('\n❌ ไม่พบแพ็กเกจ "qrcode" สำหรับวาดรูป QR Code ใน Terminal');
    console.error('กรุณาติดตั้งแพ็กเกจเสริมตัวนี้ในโครงการของคุณโดยรันคำสั่ง:\n');
    console.error('   npm install qrcode\n');
    throw new Error('Missing optional peer dependency "qrcode". Please run: npm install qrcode');
  }

  try {
    // CJS / ESM Interop: ดึงฟังก์ชัน toString อย่างปลอดภัยโดยปราศจาก 'any' (Strict TypeScript)
    const qrcodeModule = qrcodeImport as {
      toString?: QRCodeModule['toString'];
      default?: { toString?: QRCodeModule['toString'] };
    };

    const qrToString = qrcodeModule.toString || qrcodeModule.default?.toString;
    if (typeof qrToString !== 'function') {
      throw new Error('toString method is not available on qrcode package');
    }

    // Render as a compact ANSI terminal string (small: true is highly scan-friendly)
    const qrText = await qrToString(payload, { type: 'terminal', small: true });
    console.log(qrText);
  } catch (renderError) {
    throw new Error(`Failed to render QR Code to console: ${(renderError as Error).message}`);
  }
}
