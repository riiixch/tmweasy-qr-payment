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

  let qrcode: QRCodeModule;
  try {
    // Dynamic import to keep the core package free of external dependencies
    qrcode = (await import('qrcode')) as unknown as QRCodeModule;
  } catch (err) {
    console.error('\n❌ ไม่พบแพ็กเกจ "qrcode" สำหรับวาดรูป QR Code ใน Terminal');
    console.error('กรุณาติดตั้งแพ็กเกจเสริมตัวนี้ในโครงการของคุณโดยรันคำสั่ง:\n');
    console.error('   npm install qrcode\n');
    throw new Error('Missing optional peer dependency "qrcode". Please run: npm install qrcode');
  }

  try {
    // Render as a compact ANSI terminal string (small: true is highly scan-friendly)
    const qrText = await qrcode.toString(payload, { type: 'terminal', small: true });
    console.log(qrText);
  } catch (renderError) {
    throw new Error(`Failed to render QR Code to console: ${(renderError as Error).message}`);
  }
}
