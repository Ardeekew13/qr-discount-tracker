import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-discount-system';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;

  // Clear collections
  await db.collection('users').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('attendancelogs').deleteMany({});
  console.log('🗑️  Cleared existing data');

  // Create admin
  const adminHash = await bcrypt.hash('admin123', 12);
  await db.collection('users').insertOne({
    username: 'admin',
    passwordHash: adminHash,
    role: 'admin',
    fullName: 'System Administrator',
    email: 'admin@example.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✅ Admin created (admin / admin123)');

  // Create staff
  const staffHash = await bcrypt.hash('staff123', 12);
  await db.collection('users').insertOne({
    username: 'staff',
    passwordHash: staffHash,
    role: 'staff',
    fullName: 'Staff Member',
    email: 'staff@example.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✅ Staff created (staff / staff123)');

  // Import QR utility
  const QRCode = await import('qrcode');

  // Sample customers
  const customers = [
    { firstName: 'Juan', lastName: 'Dela Cruz', mobile: '09171234567', email: 'juan@email.com', defaultDiscount: 10 },
    { firstName: 'Maria', lastName: 'Santos', mobile: '09181234567', email: 'maria@email.com', defaultDiscount: 15 },
    { firstName: 'Pedro', lastName: 'Reyes', mobile: '09191234567', email: 'pedro@email.com', defaultDiscount: 5 },
    { firstName: 'Ana', lastName: 'Garcia', mobile: '09201234567', email: 'ana@email.com', defaultDiscount: 20 },
    { firstName: 'Jose', lastName: 'Rizal', mobile: '09211234567', email: 'jose@email.com', defaultDiscount: 10 },
  ];

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const customerCode = `CUST-${(i + 1).toString().padStart(6, '0')}`;
    const qrCode = await QRCode.default.toDataURL(customerCode, { width: 400, margin: 2, errorCorrectionLevel: 'H' });

    await db.collection('customers').insertOne({
      customerCode,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.lastName}`,
      mobile: c.mobile,
      email: c.email,
      defaultDiscount: c.defaultDiscount,
      qrCode,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Customer: ${c.firstName} ${c.lastName} (${customerCode})`);
  }

  console.log('\n🎉 Seed completed!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
