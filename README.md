# tmweasy-qr-payment-webhook

[![npm version](https://img.shields.io/npm/v/tmweasy-qr-payment-webhook.svg)](https://www.npmjs.com/package/tmweasy-qr-payment-webhook)
[![License](https://img.shields.io/npm/l/tmweasy-qr-payment-webhook.svg)](https://github.com/yourusername/tmweasy-qr-payment-webhook)
[![Type Safety](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](#)

TypeScript SDK สำหรับเชื่อมต่อกับ **TMWeasy PromptPay QR Webhook Payment API** เพื่อความสะดวก ปลอดภัย และมีความถูกต้องของข้อมูล 100% 

---

## 🌟 จุดเด่น (Key Features)

* **100% TypeScript & Strict Type Safety**: พัฒนาด้วย TypeScript ทั้งระบบ **ไม่มีการใช้ `any` เลยแม้แต่จุดเดียว** ทุกฟิลด์มีคำอธิบายครบถ้วนผ่าน TSDoc autocomplete แสดงผลได้ดีบน VS Code
* **Zero Dependencies**: ออกแบบโดยใช้ `fetch` API และโมดูล `crypto` ดั้งเดิมของ Node.js (ไม่มี package เสริมภายนอก ทำให้โปรเจกต์ของคุณเบา ปลอดภัย และไม่มีปัญหาช่องโหว่ความปลอดภัย)
* **Hybrid Package Support**: รองรับทั้ง **ES Modules (`import`)** และ **CommonJS (`require`)**
* **Strict Validation**: มีระบบตรวจสอบข้อมูลนำเข้าฝั่ง Client ทันทีเพื่อความรวดเร็วและปลอดภัย:
  * ยอดชำระ (`amount`) ต้องเป็นจำนวนเต็มบวกเท่านั้น (ไม่มีทศนิยม)
  * เบอร์โทรศัพท์ PromptPay (ความยาว 10-15 หลัก) และเลขบัตรประชาชน PromptPay (ความยาว 13 หลัก)
* **Smart Webhook Verification**: 
  * ตรวจสอบความถูกต้องของ MD5 Signature ของ Webhook ได้อย่างปลอดภัย
  * **Fallback Key Sorting**: รองรับการตรวจสอบผ่าน JSON Object (ในกรณีที่เฟรมเวิร์กอย่าง Express แปลงเป็น Object เรียบร้อยแล้ว ซึ่งช่วยลดความยุ่งยากของปัญหา signature ไม่ตรงอันเนื่องมาจากการจัดเรียงคีย์ของ JSON ใหม่)
* **Baht Conversion Helper**: ช่วยคำนวณและเพิ่มฟิลด์ `amount_baht` (แปลงหน่วยสตางค์เป็นบาทให้เสร็จสรรพ) ทั้งในข้อมูล QR Code และข้อมูล Webhook เพื่อนำไปแสดงผลได้ทันที

---

## 📦 การติดตั้ง (Installation)

ติดตั้งผ่าน npm หรือ package manager ที่คุณต้องการ:

```bash
npm install tmweasy-qr-payment-webhook
```

---

## 🚀 เริ่มต้นใช้งานอย่างรวดเร็ว (Quick Start)

### 1. การตั้งค่า Client (Setup Client)

```typescript
import { TMWeasyClient } from 'tmweasy-qr-payment-webhook';

const client = new TMWeasyClient({
  username: 'your_tmweasy_username',
  password: 'your_tmweasy_password',
  conId: 'your_connection_id_from_settings',
  // baseUrl: 'http://www.tmweasyapi.com/api_pph.php' // สามารถระบุ URL อื่นที่ต้องการได้ (ตัวหลักจะเป็น thaighost.net)
});
```

---

## 💻 คู่มือการใช้งาน API แต่ละขั้นตอน (API Steps Guide)

### 1️⃣ Step 1: สร้างเซสชันชำระเงิน (Create Payment Session)
สร้างรหัสชำระเงิน `id_pay` โดยระบุยอดเงินเป็นบาท (จำนวนเต็ม), ID อ้างอิงลูกค้า, และ IP ของลูกค้า

```typescript
import { TMWeasyValidationError } from 'tmweasy-qr-payment-webhook';

async function initiatePayment() {
  try {
    const response = await client.createPay({
      amount: 50, // จำนวนเต็มบวก ไม่มีทศนิยม เช่น 50 บาท (ไม่ใช่ 50.00)
      ref1: 'user_id_9999', // ข้อมูลอ้างอิงลูกค้า (เช่น username, email, phone)
      ip: '203.0.113.195'  // IP ของลูกค้าผู้ทำรายการ
    });

    if (response.status === 1) {
      console.log('สร้างรายการสำเร็จ! Payment ID:', response.id_pay);
      return response.id_pay; // นำ ID นี้ไปใช้ใน Step 2 ต่อไป
    } else {
      console.error('API ปฏิเสธการทำรายการ:', response.msg);
    }
  } catch (error) {
    if (error instanceof TMWeasyValidationError) {
      console.error('ข้อมูลนำเข้าไม่ถูกต้อง:', error.message);
    }
  }
}
```

### 2️⃣ Step 2: ดึงรายละเอียดการชำระเงินและภาพ QR Code (Get Payment Details & QR Code)
นำ `id_pay` มาขอรับภาพ QR Code ในรูปแบบ Base64 และข้อมูลอื่นๆ

```typescript
async function getQRCode(idPay: string) {
  try {
    const response = await client.detailPay({
      idPay: idPay,
      promptpayId: '0812345678', // เบอร์พร้อมเพย์ หรือเลขบัตรประชาชนของคุณที่ผูกไว้กับธนาคาร
      type: '01' // '01' สำหรับ เบอร์โทรศัพท์, '02' สำหรับ เลขบัตรประชาชน
    });

    if (response.status === 1) {
      console.log('ยอดเงินที่ลูกค้าต้องโอน (สตางค์):', response.amount_check); // เช่น "5000" (50 บาท 00 สตางค์)
      console.log('ยอดเงินที่ลูกค้าต้องโอน (บาท - แปลงโดย SDK):', response.amount_baht); // 50 (นำไปแสดงผลได้ทันที)
      console.log('เวลาคงเหลือ (วินาที):', response.time_out);
      
      // ภาพ QR Code รูปแบบ Base64 (สามารถนำไปใส่ใน tag <img src="..."> ได้เลย)
      console.log('Base64 QR Code:', response.qr_image_base64);
    } else {
      console.error('ไม่สามารถดึง QR Code ได้:', response.msg);
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
}
```

### ❌ การยกเลิกเซสชันชำระเงิน (Cancel Payment Session)
> ⚠️ **ข้อสำคัญ**: การยกเลิกจะทำได้ต่อเมื่อเวลาคงเหลือ (`time_out`) จากขั้นตอนที่ 2 **ติดลบ** (หมดเวลาชำระเงินแล้ว) เท่านั้น

```typescript
async function cancelExpiredPayment(idPay: string) {
  try {
    const response = await client.cancelPay(idPay);
    
    if (response.status === 1) {
      console.log('ยกเลิกรายการชำระเงินสำเร็จ!');
    } else {
      console.error('ไม่สามารถยกเลิกได้:', response.msg);
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการยกเลิก:', error.message);
  }
}
```

---

## 🔒 3️⃣ Step 3: การรับและตรวจสอบ Webhook (Handling & Verifying Webhook)

เมื่อมีลูกค้าโอนเงินสำเร็จ ทางระบบ TMWeasy จะส่งข้อมูล POST Request มาที่ Webhook URL ของคุณ หน้าที่ของคุณคือตรวจความปลอดภัยด้วย **API Key** ผ่านการเช็ค MD5 Signature

### 🚨 ปัญหาที่พบบ่อย (Common Pitfall)
เฟรมเวิร์กเช่น Express มักจะติดตั้ง middleware `express.json()` ซึ่งจะแปลง JSON เป็น JavaScript Object โดยอัตโนมัติ ทำให้การเปลี่ยน JSON เป็น string อีกครั้ง (`JSON.stringify`) อาจมีช่องว่างและการสลับตำแหน่งของคีย์ที่แตกต่างไปจาก String ต้นฉบับ ส่งผลให้การเช็ค signature ล้มเหลว

#### 🛠️ วิธีแก้ที่แนะนำ: ดึงข้อมูลแบบ Raw Body หรือใช้ ฟังก์ชันแปลงคีย์อัตโนมัติของ SDK

เราขอนำเสนอวิธีสร้าง Endpoint ที่ปลอดภัยที่สุดด้วย 2 เฟรมเวิร์กยอดนิยม:

### 🟢 1. ตัวอย่างการใช้ Express (แนะนำวิธี Raw Body)

เพื่อประสิทธิภาพสูงสุด ควรตั้งค่า Express ให้บันทึก Raw Body ไว้ล่วงหน้าในไฟล์ตั้งค่า Server:

```typescript
import express from 'express';
import { TMWeasyWebhook, TMWeasySignatureError } from 'tmweasy-qr-payment-webhook';

const app = express();
const API_KEY = 'your_tmweasy_api_key'; // ค้นหาได้ในหน้าตั้งค่าเว็บ TMWeasy

// บันทึก Raw Body ไว้ใน req.rawBody สำหรับใช้ในการคำนวณ MD5
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.post('/webhook/tmweasy', (req: any, res) => {
  try {
    // ดึง raw data string จาก payload และ signature
    const dataString = typeof req.body.data === 'string' ? req.body.data : JSON.stringify(req.body.data);
    const signature = req.body.signature;

    // ตรวจสอบลายเซ็นและดึงข้อมูลที่ปลอดภัย
    const verifiedData = TMWeasyWebhook.verifyAndParse({
      data: req.rawBody ? JSON.parse(req.rawBody).data : dataString,
      signature: signature
    }, API_KEY);

    console.log('ชำระเงินสำเร็จแล้ว! ข้อมูลชำระเงินจริง:');
    console.log('ID Pay:', verifiedData.id_pay);
    console.log('รหัสอ้างอิงลูกค้า (ref1):', verifiedData.ref1);
    console.log('ยอดเงินที่รับชำระ (บาท):', verifiedData.amount_baht); // เช่น 50.00
    console.log('วันที่และเวลาโอน:', verifiedData.date_pay); // รูปแบบ YYYY-MM-DD HH:mm

    // ตอบกลับสถานะสำเร็จให้ระบบ API ทราบ
    return res.status(200).json({ status: 1 });
  } catch (error) {
    if (error instanceof TMWeasySignatureError) {
      console.error('ความปลอดภัยถูกบุกรุก! Signature ไม่ตรงกับคีย์ลับ!');
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ:', error.message);
    return res.status(400).json({ error: 'Bad Request' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### ⚡ 2. ตัวอย่างการใช้ Fastify

Fastify สามารถใช้งานร่วมกับ SDK ได้อย่างราบรื่นโดยไม่เปลี่ยนคีย์ของ JSON:

```typescript
import Fastify from 'fastify';
import { TMWeasyWebhook, TMWeasySignatureError } from 'tmweasy-qr-payment-webhook';

const fastify = Fastify();
const API_KEY = 'your_tmweasy_api_key';

fastify.post('/webhook/tmweasy', async (request, reply) => {
  const body = request.body as { data: any; signature: string };

  try {
    // Fastify เก็บข้อมูล JSON ค่อนข้างถูกต้อง สามารถส่งเข้าตรวจสอบได้ทันที
    const verifiedData = TMWeasyWebhook.verifyAndParse({
      data: body.data,
      signature: body.signature
    }, API_KEY);

    fastify.log.info(`เติมเงินสำเร็จสำหรับ ID: ${verifiedData.ref1} ยอดเงิน: ${verifiedData.amount_baht} บาท`);

    // ตอบกลับ JSON {"status":1} เพื่อยืนยันว่าได้รับข้อมูลสำเร็จ
    return reply.status(200).send({ status: 1 });
  } catch (error) {
    if (error instanceof TMWeasySignatureError) {
      return reply.status(403).send({ error: 'Signature mismatched' });
    }
    return reply.status(400).send({ error: 'Invalid Webhook Data' });
  }
});

fastify.listen({ port: 3000 });
```

---

## 🚫 การจัดการข้อผิดพลาด (Exception Handling)

SDK นี้โยน Custom Error Classes ที่สืบทอดมาจาก `TMWeasyError` ทำให้นักพัฒนาสามารถแยกแยะหมวดหมู่ของข้อผิดพลาดได้อย่างมีระเบียบ:

* **`TMWeasyValidationError`**: เกิดข้อผิดพลาดจากข้อมูลนำเข้า (เช่น ยอดเงินเป็นทศนิยม หรือ IP/ประเภทพร้อมเพย์ผิดฟอร์แมต)
* **`TMWeasyAPIError`**: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ปลายทางของ TMWeasy หรือยิง API ไม่ผ่าน (มี status เป็น 0)
* **`TMWeasySignatureError`**: สัญญาณเตือนความปลอดภัยสูง เกิดเมื่อการตรวจสอบลายเซ็น MD5 ของ Webhook ล้มเหลว

```typescript
import { TMWeasyError, TMWeasyValidationError, TMWeasyAPIError } from 'tmweasy-qr-payment-webhook';

try {
  await client.createPay({ amount: 50.5, ref1: '', ip: 'bad_ip' });
} catch (error) {
  if (error instanceof TMWeasyValidationError) {
    console.error(`ข้อมูลผิดที่ฟิลด์ "${error.field}":`, error.message);
  } else if (error instanceof TMWeasyAPIError) {
    console.error('เซิร์ฟเวอร์ตอบกลับไม่ผ่าน หรือ HTTP Error:', error.message);
  } else if (error instanceof TMWeasyError) {
    console.error('ข้อผิดพลาดอื่นๆ ของ SDK:', error.message);
  }
}
```

---

## ⚡ ฟีเจอร์ขั้นสูง (Advanced Features)

### 1. ระบบพยายามใหม่และรับมือเน็ตหลุด (Automatic Retry & Backoff)
คุณสามารถตั้งค่าให้ตัว SDK ทำการยิงความพยายามใหม่แบบอัตโนมัติเมื่อเกิดปัญหาเน็ตหลุด หรือฝั่ง API ขัดข้องชั่วคราว (HTTP Status 5xx) โดยใช้กลไก **Exponential Backoff** (เบิ้ลเวลารอรอบถัดไปเป็นเท่าตัว เพื่อความทนทานสูงสุดของแอปพลิเคชัน):

```typescript
import { TMWeasyClient } from 'tmweasy-qr-payment-webhook';

const client = new TMWeasyClient({
  username: 'your_username',
  password: 'your_password',
  conId: 'your_con_id',
  retryOptions: {
    retries: 3,       // ทำการลองใหม่สูงสุด 3 ครั้งเมื่อเกิดข้อผิดพลาดด้านเน็ตหรือเซิร์ฟเวอร์ปลายทาง
    minTimeout: 1000, // เวลารอเริ่มต้นก่อนทำซ้ำรอบแรก (1 วินาที)
    factor: 2,        // อัตราการคูณความล่าช้าแบบทวีคูณ (1s -> 2s -> 4s)
  }
});
```

### 2. วาดภาพ QR Code ใน Terminal (ANSI Console QR Code)
หากคุณต้องการให้นำรหัสพร้อมเพย์มาวาดแสดงผลภาพ QR Code เป็นตัวอักษรสีดำขาวบนหน้าต่าง Terminal โดยตรง (เพื่อความสะดวกและรวดเร็วสูงสุดในการใช้โทรศัพท์มือถือสแกนจ่ายเงินจริงเพื่อทดสอบระบบระหว่างเขียนแอปพลิเคชัน) 

> [!NOTE]
> ฟีเจอร์นี้เรียกใช้โมดูลแบบ **Dynamic Loading** โดยกำหนดให้ต้องติดตั้งแพ็กเกจ `qrcode` ก่อนใช้งาน:
> ```bash
> npm install qrcode
> ```

ตัวอย่างวิธีการใช้ร่วมกับเมธอด `detailPay`:

```typescript
import { TMWeasyClient, renderQRToConsole } from 'tmweasy-qr-payment-webhook';

const client = new TMWeasyClient({ ... });

const response = await client.detailPay({
  idPay: '754349',
  promptpayId: '0812345678',
  type: '01'
});

if (response.status === 1 && response.promptpay_payload) {
  // วาดรูป QR Code ขนาดกะทัดรัดลงบน Terminal ทันที!
  await renderQRToConsole(response.promptpay_payload);
}
```

---

## 📄 ใบอนุญาต (License)

คำสั่งและโค้ดภายในโครงการนี้อยู่ภายใต้ใบอนุญาต [ISC License](LICENSE).

