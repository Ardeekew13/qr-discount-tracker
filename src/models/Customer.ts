import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  customerCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  mobile?: string;
  email?: string;
  address?: string;
  defaultDiscount: number;
  notes?: string;
  qrCode?: string; // Stores only the QR code string value (no Base64 image)
  photo?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    defaultDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      trim: true,
    },
    qrCode: {
      type: String, // Stores the QR code string, NOT a Base64 image
    },
    photo: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Optimized indexes for 10,000+ customers
CustomerSchema.index({ fullName: 'text', firstName: 'text', lastName: 'text' });
CustomerSchema.index({ status: 1, createdAt: -1 });
CustomerSchema.index({ qrCode: 1 }, { sparse: true });

CustomerSchema.pre('save', function (next) {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
  next();
});

export const Customer =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
