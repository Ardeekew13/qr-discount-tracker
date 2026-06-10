import QRCode from 'qrcode';
import { Customer } from '@/models';

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

export async function generateQRCodeData(customerCode: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(customerCode, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  return qrDataUrl;
}
