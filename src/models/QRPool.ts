import mongoose, { Schema, Document } from 'mongoose';

export interface IQRPool extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  qrImage: string;
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
    qrImage: {
      type: String,
      required: true,
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

QRPoolSchema.index({ status: 1 });
QRPoolSchema.index({ batchId: 1 });
QRPoolSchema.index({ customerId: 1 });

export const QRPool =
  mongoose.models.QRPool || mongoose.model<IQRPool>('QRPool', QRPoolSchema);
