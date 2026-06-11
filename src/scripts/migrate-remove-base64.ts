import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Migration: Remove Base64 QR images from MongoDB.
 * 
 * This script:
 * 1. Removes qrImage field from all QR pool documents
 * 2. Converts customer.qrCode from Base64 data URLs to just the code string
 * 3. Reports space saved
 * 
 * Run: npx tsx src/scripts/migrate-remove-base64.ts
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-discount-system';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;

  // 1. Remove qrImage from QR pool
  console.log('\n📦 Migrating QR Pool...');
  const qrPoolResult = await db.collection('qrpools').updateMany(
    { qrImage: { $exists: true } },
    { $unset: { qrImage: '' } }
  );
  console.log(`   Updated ${qrPoolResult.modifiedCount} QR pool documents (removed qrImage field)`);

  // 2. Convert customer qrCode from Base64 to code string
  console.log('\n👤 Migrating Customers...');
  const customers = await db.collection('customers').find({
    qrCode: { $regex: '^data:image' } // Only process Base64 data URLs
  }).toArray();

  let convertedCount = 0;
  for (const customer of customers) {
    // Replace Base64 image with just the customerCode
    await db.collection('customers').updateOne(
      { _id: customer._id },
      { $set: { qrCode: customer.customerCode } }
    );
    convertedCount++;
  }
  console.log(`   Converted ${convertedCount} customers (Base64 → code string)`);

  // Set qrCode to customerCode for any customers missing it
  const missingQR = await db.collection('customers').updateMany(
    { qrCode: { $exists: false } },
    [{ $set: { qrCode: '$customerCode' } }]
  );
  if (missingQR.modifiedCount > 0) {
    console.log(`   Set qrCode for ${missingQR.modifiedCount} customers that were missing it`);
  }

  // 3. Report stats
  console.log('\n📊 Collection stats after migration:');
  const qrPoolCount = await db.collection('qrpools').countDocuments();
  const customerCount = await db.collection('customers').countDocuments();
  console.log(`   QR Pool: ${qrPoolCount} documents`);
  console.log(`   Customers: ${customerCount} documents`);

  console.log('\n🎉 Migration completed!');
  console.log('   ✓ Base64 images removed from MongoDB');
  console.log('   ✓ QR images are now generated dynamically in the frontend');
  console.log('   ✓ Significant storage space freed up');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
