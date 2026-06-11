import { Customer, QRPool } from '@/models';

/**
 * Generate the next sequential customer code (e.g., CUST-000001)
 */
export async function generateCustomerCode(): Promise<string> {
  const lastCustomer = await Customer.findOne().sort({ customerCode: -1 }).select('customerCode');

  let nextNumber = 1;
  if (lastCustomer && lastCustomer.customerCode) {
    const match = lastCustomer.customerCode.match(/CUST-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `CUST-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Generate a random 8-character alphanumeric QR code.
 * Excludes confusing characters (0, O, 1, I).
 */
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique QR code string that doesn't exist in the QR pool or customer codes.
 */
export async function generateUniqueQRCode(): Promise<string> {
  let code: string;
  let exists = true;

  while (exists) {
    code = generateRandomCode();
    const [poolExists, customerExists] = await Promise.all([
      QRPool.exists({ code }),
      Customer.exists({ customerCode: code }),
    ]);
    exists = !!(poolExists || customerExists);
  }

  return code!;
}

/**
 * Generate multiple unique QR codes efficiently using batch checking.
 */
export async function generateBatchCodes(count: number): Promise<string[]> {
  const existingCodes = new Set<string>();

  // Batch load existing codes for performance
  const [existingPool, existingCustomers] = await Promise.all([
    QRPool.find({}).select('code').lean(),
    Customer.find({}).select('customerCode').lean(),
  ]);
  existingPool.forEach((p: any) => existingCodes.add(p.code));
  existingCustomers.forEach((c: any) => existingCodes.add(c.customerCode));

  const codes: string[] = [];
  const newCodes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let code: string;
    do {
      code = generateRandomCode();
    } while (existingCodes.has(code) || newCodes.has(code));
    newCodes.add(code);
    codes.push(code);
  }

  return codes;
}
