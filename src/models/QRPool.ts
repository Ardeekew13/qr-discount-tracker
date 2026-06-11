import mongoose, { Schema, Document } from 'mongoose';

export interface IQRPool extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  status: 'available' | 'assigned';
  customerId?: mongoose.Types.ObjectId;
  batchId: string;
  generatedAt: Date;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QRPoolSchema = new Schema<IQRPool>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['available', 'assigned'],
      default: 'available',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    assignedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Optimized indexes for 10,000+ customers and fast lookups
QRPoolSchema.index({ status: 1, generatedAt: -1 });
QRPoolSchema.index({ customerId: 1 }, { sparse: true });
QRPoolSchema.index({ code: 1, status: 1 });

export const QRPool =
  mongoose.models.QRPool || mongoose.model<IQRPool>('QRPool', QRPoolSchema);
