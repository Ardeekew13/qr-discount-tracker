import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceLog extends Document {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerCode: string;
  totalAmount: number;
  discountUsed: number;
  finalAmount: number;
  scannedBy: mongoose.Types.ObjectId;
  scannedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerCode: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountUsed: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

AttendanceLogSchema.index({ customerId: 1, scannedAt: -1 });
AttendanceLogSchema.index({ customerCode: 1 });
AttendanceLogSchema.index({ scannedAt: -1 });
AttendanceLogSchema.index({ scannedBy: 1 });

export const AttendanceLog =
  mongoose.models.AttendanceLog || mongoose.model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
