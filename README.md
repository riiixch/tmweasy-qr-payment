# 🇹🇭 @riiixch/tmweasy-qr-payment 💸

[![npm version](https://img.shields.io/npm/v/%40riiixch%2Ftmweasy-qr-payment.svg)](https://www.npmjs.com/package/@riiixch/tmweasy-qr-payment)
[![License](https://img.shields.io/npm/l/%40riiixch%2Ftmweasy-qr-payment.svg)](#)
[![Type Safety](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](#)
[![Developer](https://img.shields.io/badge/Developer-RIIIXCH-orange.svg)](https://github.com/riiixch)

> **สร้างและตรวจสอบระบบรับชำระเงิน PromptPay QR Code ผ่าน TMWeasy API ด้วย SDK แยกสองระบบสมบูรณ์ 100% สำหรับ Webhook (Event-Driven) และ Direct Bank (accode Check) ที่มีความปลอดภัยสูงในระดับ Enterprise-grade สำหรับ TypeScript & Node.js**

---

## 💡 แก้ไขปัญหาอะไร? (What Problem Does This Solve?)

การเชื่อมต่อระบบรับเงินพร้อมเพย์ด้วยตัวเองมักมีข้อจำกัดที่ท้าทายต่อนักพัฒนาตลอดเวลา SDK ตัวนี้แก้จุดอ่อนทั้งหมดโดยนำเสนอ **2 ระบบการเชื่อมต่อแยกออกจากกันโดยสมบูรณ์** เพื่อให้นักพัฒนาเลือกใช้งานตามสถาปัตยกรรมของโครงการของตนเองอย่างชัดเจน:

### 1️⃣ ระบบ Webhook Flow (`TMWeasyQRPaymentWebhook`)
*   **รูปแบบการทำงาน**: ลูกค้าสแกนจ่ายเงิน -> TMWeasy ยิงคำขอยืนยันสัญญากลับมาที่ endpoint ของคุณ -> ตรวจสอบลายเซ็น MD5 Signature ทันที
*   **แก้ไขปัญหา**: 
    *   **Smart Key Sorting**: ปรับแก้ปัญหาการสลับตำแหน่งของคีย์ JSON ยามผ่าน Express parsing middleware ด้วยระบบ Fallback Key Sorting อัตโนมัติ ทำให้การคำนวณตรวจสอบลายเซ็นถูกต้อง 100%
    *   **หน่วยสตางค์**: แปลงหน่วยสตางค์จาก API เป็นหน่วยบาท (`amount_baht` ตัวเลข float 2 ตำแหน่ง) ให้พร้อมเสิร์ฟทันทีใน Callback

### 2️⃣ ระบบ Direct Bank Flow (`TMWeasyQRPayment`)
*   **รูปแบบการทำงาน**: ดึงข้อมูลและตรวจสอบยอดโอนโดยตรงกับบัญชีธนาคารของคุณผ่าน **accode** (รหัสเข้ารหัสธนาคาร) และ **accountNo** (เลขบัญชีธนาคาร 10 หลัก) ได้ทันทีแบบ Real-time โดยไม่ต้องพึ่ง Webhook
*   **แก้ไขปัญหา**: 
    *   **รองรับ E-Wallet (ประเภท "03")**: ดึงข้อมูลและคำนวณ EMVCo Payload สำหรับ PromptPay E-Wallet ID ความยาว 10-20 หลัก (เช่น KBANK/SCB E-Wallet) พร้อมกับเบอร์โทรศัพท์และเลขบัตรประชาชนได้โดยตรง
    *   **ความแม่นยำสูง**: ไม่จำเป็นต้องรอการยิง callback เข้ามา สามารถทำ Polling หรือยิง Check ยอดเงินแบบเรียลไทม์ฝั่งหลังบ้านได้อย่างเด็ดขาด

---

## 🌟 จุดเด่นของแพ็กเกจ (Key Features)

*   **100% TypeScript & Strict Type Safety**: พัฒนาด้วย TypeScript ทุกบรรทัด **ไม่มีการใช้ `any` เด็ดขาด** 🛡️
*   **Zero Core Dependencies**: ไร้แพ็กเกจภายนอกในระบบแกนหลัก (อาศัย Native Node `fetch` และ `crypto`) รวดเร็วและปราศจากช่องโหว่ความปลอดภัย
*   **Independent Module Configs**: แยกการตั้งค่าคอนฟิก `TMWeasyQRPaymentWebhookConfig` และ `TMWeasyQRPaymentConfig` ออกจากกันโดยสิ้นเชิง ป้องกันการใส่ข้อมูลปะปน
*   **Automatic Retry & Backoff**: ติดตั้งระบบยิงความพยายามใหม่แบบทวีคูณ (Exponential Backoff) เมื่อตรวจพบเครือข่ายขัดข้องชั่วขณะ ป้องกันระบบหยุดทำงานเมื่อเน็ตหลุด
*   **Console QR Generator (ANSI)**: วาดรูปสแกน QR Code พร้อมเพย์ลงบน Terminal ได้ทันทีผ่านการเรียกใช้งานเบาๆ ช่วยให้เปิดจอมือถือสแกนจ่ายทดสอบระบบได้ในเวลาไม่ถึง 1 วินาที!

---

## 📦 การติดตั้ง (Installation)

```bash
npm install @riiixch/tmweasy-qr-payment
```

---

## 🚀 1. คู่มือการใช้ Webhook Flow (`TMWeasyQRPaymentWebhook`)

ระบบนี้เหมาะสำหรับโครงการที่ใช้สถาปัตยกรรมแบบ **Event-Driven** โดยให้ฝั่งเซิร์ฟเวอร์หลักของ TMWeasy ส่งสัญญาณ Webhook เพื่ออนุมัติบิล

### โค้ดตัวอย่าง Express Server สมบูรณ์แบบ (Webhook Flow)

```typescript
import express from 'express';
import { TMWeasyQRPaymentWebhook, TMWeasyWebhook, AutoCancelHandle } from '@riiixch/tmweasy-qr-payment';

const app = express();
const API_KEY = 'your_tmweasy_api_key'; // ค้นหาได้ในหน้าเซ็ตติ้ง TMWeasy

// ตั้งค่า Client Webhook (ชี้ไปที่ api_pph.php อัตโนมัติ)
const client = new TMWeasyQRPaymentWebhook({
  username: 'your_username',
  password: 'your_password',
  conId: 'your_con_id',
  retryOptions: {
    retries: 3,       // พยายามยิงส่งซ้ำสูงสุด 3 ครั้งยามเน็ตหลุด
    minTimeout: 1000, // เวลารอบแรก 1 วินาที
    factor: 2         // คูณเวลารอแบบทวีคูณ (1s -> 2s -> 4s)
  }
});

// แผนที่สำหรับเก็บงานนับถอยหลังยกเลิก (Active Cancellers Map)
const activeCancellers = new Map<string, AutoCancelHandle>();

// 1️⃣ ขอชำระเงิน: สร้างและแสดงผล QR Code พร้อมจำกัดเวลา
app.post('/api/checkout-webhook', async (req, res) => {
  try {
    // Step 1: ขอรหัสชำระเงิน
    const session = await client.createPay({ amount: 50, ref1: 'order_12345', ip: '127.0.0.1' });
    
    // Step 2: สร้างรูป QR Code และดึงเวลาหมดอายุ
    const qrData = await client.detailPay({
      idPay: session.id_pay!,
      promptpayId: '0812345678', // เบอร์พร้อมเพย์รับเงินของคุณ
      type: '01'                 // '01' = เบอร์โทรศัพท์, '02' = บัตรประชาชน
    });

    if (qrData.status === 1 && qrData.time_out) {
      // ⏳ สั่งตั้งเวลาทำการยกเลิกบิลอัตโนมัติเมื่อหมดเวลา
      const handle = client.scheduleAutoCancel(session.id_pay!, qrData.time_out, {
        onSuccess: (response) => console.log(`[ID ${session.id_pay}] ถูกยกเลิกอัตโนมัติสำเร็จ:`, response.msg),
        onError: (err) => console.error(`[ID ${session.id_pay}] ล้มเหลวในการยกเลิกอัตโนมัติ:`, err.message)
      });

      // บันทึกตัวควบคุมเก็บไว้ด้วย ID Pay
      activeCancellers.set(session.id_pay!, handle);
    }

    res.json({
      success: true,
      amount: qrData.amount_baht,       // ยอดเงินโอนจริงในหน่วยบาท (แปลงทศนิยมให้เสร็จ)
      qrBase64: qrData.qr_image_base64, // รูปพร้อมเพย์แสดงผล <img src="..."> ได้เลย
      timeLeft: qrData.time_out         // วินาทีคงเหลือในการชำระ
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2️⃣ รับ Webhook: เมื่อลูกค้าจ่ายสำเร็จ ตรวจลายเซ็นและหยุดตัวนับเวลาถอยหลังทันที
app.post('/webhook/payment', express.json(), (req, res) => {
  try {
    // Step 3: ตรวจสอบความถูกต้องของ Signature
    const verified = TMWeasyWebhook.verifyAndParse(req.body, API_KEY);

    if (verified.status === 1) {
      console.log(`🎉 ได้รับการโอนเงินจำนวน ${verified.amount_baht} บาทสำเร็จ!`);
      
      // 🛑 หยุดตัวจับเวลานับถอยหลังยกเลิกทันที (ลูกค้าทำเสร็จสมบูรณ์!)
      const handle = activeCancellers.get(verified.id_pay);
      if (handle) {
        handle.stop();
        activeCancellers.delete(verified.id_pay);
      }

      // จัดส่งเครดิต/สินค้าให้ผู้จ่ายในส่วนนี้...
    }

    res.status(200).json({ status: 1 });
  } catch (error: any) {
    console.error('ลายเซ็นไม่ถูกต้องหรือเกิดการบุกรุก!', error.message);
    res.status(403).json({ error: 'Unauthorized signature' });
  }
});

app.listen(3000, () => console.log('Server Webhook running on port 3000'));
```

---

## 🚀 2. คู่มือการใช้ Direct Bank Flow (`TMWeasyQRPayment`)

เหมาะสำหรับโครงการที่อยาก **ยืนยันการโอนเงินกับบัญชีธนาคารโดยตรง (Direct Check)** ผ่านธนาคารโดยใช้ `accode` (ไม่ต้องพึ่งสัญญาณ Webhook จากภายนอก)

### โค้ดตัวอย่าง Express Server สมบูรณ์แบบ (Direct Bank Flow)

```typescript
import express from 'express';
import { TMWeasyQRPayment, AutoCancelHandle } from '@riiixch/tmweasy-qr-payment';

const app = express();

// ตั้งค่า Client ยืนยันยอดตรง (ชี้ไปที่ apipp.php อัตโนมัติและรองรับ HTTPS)
const directPayment = new TMWeasyQRPayment({
  username: 'your_username',
  password: 'your_password',
  conId: 'your_con_id',
  accode: 'your_accode_from_settings', // ใส่ที่นี่เพื่อใช้เป็นค่ากลางสะดวกๆ
  accountNo: '0123456789'              // เลขบัญชีธนาคารรับเงิน 10 หลัก
});

const activeCancellers = new Map<string, AutoCancelHandle>();

// 1️⃣ ลูกค้าเปิดยอด: สร้างสิทธิ์และภาพ QR Code (รองรับ E-Wallet "03")
app.post('/api/checkout-direct', async (req, res) => {
  try {
    // Step 1: สร้าง session การชำระเงิน
    const session = await directPayment.createPay({
      amount: 150, // จำนวนเงินหน่วยบาท
      ref1: 'direct_order_998',
      ip: '127.0.0.1'
    });

    // Step 2: สร้างบิลและรับ QR Code ภาพพร้อม EMVCo payload
    const qrData = await directPayment.detailPay({
      idPay: session.id_pay!,
      promptpayId: '140001234567890', // E-Wallet ID หรือเบอร์พร้อมเพย์รับเงิน
      type: '03'                       // '01' = มือถือ, '02' = บัตรประชาชน, '03' = E-Wallet ID
    });

    if (qrData.status === 1 && qrData.time_out) {
      // ⏳ สั่งตั้งเวลานับถอยหลังยกเลิกอัตโนมัติหากไม่จ่ายในเวลา
      const handle = directPayment.scheduleAutoCancel(session.id_pay!, qrData.time_out, {
        onSuccess: () => console.log(`[ID ${session.id_pay}] สั่งยกเลิกสำเร็จเนื่องจากหมดเวลา`),
        onError: (err) => console.error(`[ID ${session.id_pay}] สั่งยกเลิกเมื่อหมดเวลาล้มเหลว:`, err.message)
      });
      activeCancellers.set(session.id_pay!, handle);
    }

    res.json({
      success: true,
      idPay: session.id_pay,
      qrBase64: qrData.qr_image_base64,
      timeLeft: qrData.time_out
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2️⃣ ปุ่มกดตรวจสอบยอด/หรือรัน Polling: ยืนยันเงินโอนกับธนาคารโดยตรง (Step 3 - confirm)
app.post('/api/verify-payment', async (req, res) => {
  const { idPay, clientIp } = req.body;

  try {
    // Step 3: สั่งเช็คยืนยันยอดเงินผ่านรหัส accode และเลขบัญชีธนาคารโดยตรง
    const verification = await directPayment.confirmPay({
      idPay: idPay,
      ip: clientIp, // IP ของลูกค้าขณะกดยืนยันตัวตน
      // accode และ accountNo จะถูกดักดึงจาก Config โดยอัตโนมัติ หรือส่ง override ตรงนี้ได้
    });

    if (verification.status === 1) {
      console.log(`🎉 ธนาคารตอบกลับ: ยอดเงิน ${verification.amount} บาท โอนสำเร็จจริงในวันที่ ${verification.date_pay}!`);
      
      // 🛑 หยุดตัวจับเวลานับถอยหลังยกเลิกทันที (จ่ายเงินเสร็จเรียบร้อย!)
      const handle = activeCancellers.get(idPay);
      if (handle) {
        handle.stop();
        activeCancellers.delete(idPay);
      }

      return res.json({ success: true, message: 'ชำระเงินสำเร็จแล้ว!' });
    } else {
      return res.json({ success: false, message: verification.msg || 'ยังไม่พบยอดเงินโอนเข้าบัญชี' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server Direct Bank running on port 3001'));
```

---

## ⚡ ฟีเจอร์ขั้นสูงสำหรับธุรกิจ (Advanced Business Utilities)

### 1. การวาดภาพ QR Code ใน Terminal (ANSI Console QR Code)
สำหรับนักพัฒนาที่ต้องการนำ EMVCo payload มาสั่งสแกนทดสอบจ่ายเงินจริงผ่าน Console หน้าต่างระหว่างพัฒนาแอปพลิเคชัน

> [!NOTE]
> ฟีเจอร์นี้ต้องติดตั้งแพ็กเกจ `qrcode` ในเครื่องก่อนใช้งาน:
> ```bash
> npm install qrcode
> ```

```typescript
import { renderQRToConsole } from '@riiixch/tmweasy-qr-payment';

// นำ promptpay_payload ที่ได้จากเมธอด detailPay มาแสดงผล
if (qrData.status === 1 && qrData.promptpay_payload) {
  await renderQRToConsole(qrData.promptpay_payload);
}
```

### 2. การจัดการข้อยกเว้นและข้อผิดพลาด (Exception Handling)
SDK นี้โยนข้อผิดพลาดที่มีคลาสระบุตัวตนชัดเจน ทำให้ดักครอบ `try-catch` และควบคุมระบบหลักไม่ให้หยุดทำงานได้ง่าย:

*   **`TMWeasyValidationError`**: ข้อมูลนำเข้าฝั่งหลังบ้านผิดพลาด (เช่น ยอดเงินไม่ใช่เลขจำนวนเต็ม หรือเบอร์โทรศัพท์/เลขบัญชีไม่ตรงจำนวนหลัก)
*   **`TMWeasyAPIError`**: ได้รับข้อความปฏิเสธจาก API ฝั่งปลายทาง (status เป็น 0) หรือปัญหาเน็ตหลุด
*   **`TMWeasySignatureError`**: สัญญาณเตือนภัยด้านความมั่นคง: ลายเซ็น MD5 Webhook ไม่ตรงกับที่ถอดรหัสผ่าน API Key

```typescript
import { TMWeasyValidationError, TMWeasyAPIError, TMWeasyError } from '@riiixch/tmweasy-qr-payment';

try {
  await directPayment.confirmPay({ idPay: '123', ip: '127.0.0.1', accountNo: 'bad_number' });
} catch (error) {
  if (error instanceof TMWeasyValidationError) {
    console.error(`ข้อมูลผิดปกติที่ช่อง "${error.field}":`, error.message);
  } else if (error instanceof TMWeasyAPIError) {
    console.error(`มีปัญหาการสื่อสาร API (HTTP ${error.statusCode}):`, error.message);
  } else if (error instanceof TMWeasyError) {
    console.error('ข้อผิดพลาดทั่วไปของ SDK:', error.message);
  }
}
```

---

## 👥 ผู้พัฒนา (Developer Credit)

*   **RIIIXCH** — [GitHub Profile](https://github.com/riiixch)

---

## 📄 ใบอนุญาต (License)

ชุดคำสั่งและโค้ดภายในโครงการนี้อยู่ภายใต้ข้อตกลงใบอนุญาต [ISC License](LICENSE).
