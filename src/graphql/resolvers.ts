import { GraphQLScalarType, Kind, GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { getSession, SessionData } from '@/lib/session';
import { User, Customer, AttendanceLog, QRPool } from '@/models';
import { generateQRCodeData, generateCustomerCode } from '@/utils/qrcode';

// Context type for resolvers
export interface GqlContext {
  session: Awaited<ReturnType<typeof getSession>>;
}

// Auth guards
function requireAuth(ctx: GqlContext) {
  if (!ctx.session.user) {
    throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.session.user;
}

function requireAdmin(ctx: GqlContext) {
  const user = requireAuth(ctx);
  if (user.role !== 'admin') {
    throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
}

// Custom scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    // AUTH
    me: async (_: any, __: any, ctx: GqlContext) => {
      await connectDB();
      if (!ctx.session.user) return null;
      return User.findById(ctx.session.user._id).select('-passwordHash');
    },

    // USERS
    users: async (_: any, __: any, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      return User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    },
    user: async (_: any, args: { id: string }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      return User.findById(args.id).select('-passwordHash').lean();
    },

    // CUSTOMERS
    customers: async (_: any, args: { filter?: any }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const { filter } = args;
      const page = filter?.page || 1;
      const pageSize = Math.min(filter?.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const query: any = {};
      if (filter?.search) {
        query.$or = [
          { fullName: { $regex: filter.search, $options: 'i' } },
          { customerCode: { $regex: filter.search, $options: 'i' } },
          { mobile: { $regex: filter.search, $options: 'i' } },
          { email: { $regex: filter.search, $options: 'i' } },
        ];
      }
      if (filter?.status) query.status = filter.status;

      let sort: any = { createdAt: -1 };
      if (filter?.sortField) {
        sort = { [filter.sortField]: filter.sortOrder === 'ascend' ? 1 : -1 };
      }

      const [customers, total] = await Promise.all([
        Customer.find(query).sort(sort).skip(skip).limit(pageSize).lean(),
        Customer.countDocuments(query),
      ]);

      if (customers.length === 0) return { customers: [], total, page, pageSize };

      // Batch lookup: get lastVisit and totalVisits for all customers in one aggregation
      const customerIds = customers.map((c: any) => c._id);
      const visitStats = await AttendanceLog.aggregate([
        { $match: { customerId: { $in: customerIds } } },
        { $group: { _id: '$customerId', totalVisits: { $sum: 1 }, lastVisit: { $max: '$scannedAt' } } },
      ]);

      const statsMap = new Map(visitStats.map((s: any) => [s._id.toString(), s]));
      const customersWithVisits = customers.map((c: any) => {
        const stats = statsMap.get(c._id.toString());
        return { ...c, lastVisit: stats?.lastVisit || null, totalVisits: stats?.totalVisits || 0 };
      });

      return { customers: customersWithVisits, total, page, pageSize };
    },

    customer: async (_: any, args: { id: string }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const customer = await Customer.findById(args.id);
      if (!customer) throw new GraphQLError('Customer not found');
      const lastLog = await AttendanceLog.findOne({ customerId: customer._id }).sort({ scannedAt: -1 }).select('scannedAt');
      const totalVisits = await AttendanceLog.countDocuments({ customerId: customer._id });
      return { ...customer.toObject(), lastVisit: lastLog?.scannedAt || null, totalVisits };
    },

    customerByCode: async (_: any, args: { code: string }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const customer = await Customer.findOne({ customerCode: args.code.toUpperCase() });
      if (!customer) throw new GraphQLError('Customer not found');
      const lastLog = await AttendanceLog.findOne({ customerId: customer._id }).sort({ scannedAt: -1 }).select('scannedAt');
      const totalVisits = await AttendanceLog.countDocuments({ customerId: customer._id });
      return { ...customer.toObject(), lastVisit: lastLog?.scannedAt || null, totalVisits };
    },

    searchCustomers: async (_: any, args: { query: string }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      return Customer.find({
        $or: [
          { fullName: { $regex: args.query, $options: 'i' } },
          { customerCode: { $regex: args.query, $options: 'i' } },
          { mobile: { $regex: args.query, $options: 'i' } },
        ],
        status: 'active',
      }).limit(10);
    },

    // ATTENDANCE
    attendanceLogs: async (_: any, args: { filter?: any; page?: number; pageSize?: number }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const query: any = {};
      if (args.filter) {
        if (args.filter.startDate || args.filter.endDate) {
          query.scannedAt = {};
          if (args.filter.startDate) query.scannedAt.$gte = new Date(args.filter.startDate);
          if (args.filter.endDate) query.scannedAt.$lte = new Date(args.filter.endDate);
        }
        if (args.filter.customerId) query.customerId = args.filter.customerId;
        if (args.filter.customerCode) query.customerCode = args.filter.customerCode;
        if (args.filter.staffId) query.scannedBy = args.filter.staffId;
      }

      const [logs, total] = await Promise.all([
        AttendanceLog.find(query)
          .sort({ scannedAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate('customerId', 'fullName customerCode')
          .populate('scannedBy', 'fullName username')
          .lean(),
        AttendanceLog.countDocuments(query),
      ]);

      // Map populated fields to match GraphQL expected shape
      const mapped = logs.map((log: any) => ({
        ...log,
        _id: log._id.toString(),
        customer: log.customerId && typeof log.customerId === 'object'
          ? { _id: log.customerId._id, fullName: log.customerId.fullName, customerCode: log.customerId.customerCode }
          : null,
        staff: log.scannedBy && typeof log.scannedBy === 'object'
          ? { _id: log.scannedBy._id, fullName: log.scannedBy.fullName, username: log.scannedBy.username }
          : null,
        customerId: log.customerId?._id || log.customerId,
        scannedBy: log.scannedBy?._id || log.scannedBy,
      }));

      return { logs: mapped, total, page, pageSize };
    },

    customerAttendance: async (_: any, args: { customerId: string; page?: number; pageSize?: number }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const [logs, total] = await Promise.all([
        AttendanceLog.find({ customerId: args.customerId })
          .sort({ scannedAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate('scannedBy', 'fullName username')
          .lean(),
        AttendanceLog.countDocuments({ customerId: args.customerId }),
      ]);

      const mapped = logs.map((log: any) => ({
        ...log,
        _id: log._id.toString(),
        staff: log.scannedBy && typeof log.scannedBy === 'object'
          ? { _id: log.scannedBy._id, fullName: log.scannedBy.fullName }
          : null,
        scannedBy: log.scannedBy?._id || log.scannedBy,
      }));

      return { logs: mapped, total, page, pageSize };
    },

    // DASHBOARD
    dashboardSummary: async (_: any, __: any, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalCustomers, todayAttendance, monthlyAttendance, activeCustomers] = await Promise.all([
        Customer.countDocuments(),
        AttendanceLog.countDocuments({ scannedAt: { $gte: startOfToday } }),
        AttendanceLog.countDocuments({ scannedAt: { $gte: startOfMonth } }),
        Customer.countDocuments({ status: 'active' }),
      ]);

      const avgResult = await AttendanceLog.aggregate([
        { $group: { _id: null, avgDiscount: { $avg: '$discountUsed' } } },
      ]);
      const averageDiscount = avgResult.length > 0 ? Math.round(avgResult[0].avgDiscount * 100) / 100 : 0;

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyAttendance = await AttendanceLog.aggregate([
        { $match: { scannedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]);

      const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const monthlyAttendanceChart = await AttendanceLog.aggregate([
        { $match: { scannedAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$scannedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]);

      const topReturningCustomers = await AttendanceLog.aggregate([
        { $group: { _id: '$customerId', customerCode: { $first: '$customerCode' }, visits: { $sum: 1 } } },
        { $sort: { visits: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
        { $unwind: '$customer' },
        { $project: { customerId: '$_id', customerCode: 1, fullName: '$customer.fullName', visits: 1, _id: 0 } },
      ]);

      return {
        totalCustomers, todayAttendance, monthlyAttendance, activeCustomers,
        averageDiscount, dailyAttendance, monthlyAttendanceChart, topReturningCustomers,
      };
    },

    customerReports: async (_: any, __: any, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      return AttendanceLog.aggregate([
        {
          $group: {
            _id: '$customerId',
            customerCode: { $first: '$customerCode' },
            totalVisits: { $sum: 1 },
            averageDiscount: { $avg: '$discountUsed' },
            totalRevenue: { $sum: { $ifNull: ['$finalAmount', 0] } },
            totalDiscountAmount: { $sum: { $subtract: [{ $ifNull: ['$totalAmount', 0] }, { $ifNull: ['$finalAmount', 0] }] } },
            lastVisit: { $max: '$scannedAt' },
          },
        },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
        { $unwind: '$customer' },
        {
          $project: {
            customerId: '$_id',
            customerCode: 1,
            fullName: '$customer.fullName',
            totalVisits: 1,
            averageDiscount: { $round: ['$averageDiscount', 2] },
            totalRevenue: { $round: ['$totalRevenue', 2] },
            totalDiscountAmount: { $round: ['$totalDiscountAmount', 2] },
            lastVisit: 1,
            _id: 0,
          },
        },
        { $sort: { totalVisits: -1 } },
      ]);
    },

    // QR POOL QUERIES
    qrPool: async (_: any, args: { status?: string; batchId?: string; search?: string; page?: number; pageSize?: number }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const query: any = {};
      if (args.status) query.status = args.status;
      if (args.batchId) query.batchId = args.batchId;
      if (args.search) query.code = { $regex: args.search.toUpperCase(), $options: 'i' };

      const [items, total] = await Promise.all([
        QRPool.find(query)
          .select('-qrImage')
          .populate('customerId', 'fullName customerCode')
          .sort({ generatedAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        QRPool.countDocuments(query),
      ]);

      // Map populated customerId to customer field for GraphQL
      const mapped = items.map((item: any) => ({
        ...item,
        _id: item._id.toString(),
        customer: item.customerId && typeof item.customerId === 'object'
          ? { _id: item.customerId._id, fullName: item.customerId.fullName, customerCode: item.customerId.customerCode }
          : null,
        customerId: item.customerId?._id || item.customerId || null,
      }));

      return { items: mapped, total, page, pageSize };
    },

    qrPoolImages: async (_: any, args: { ids: string[] }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      if (args.ids.length > 200) throw new GraphQLError('Max 200 images at once');
      return QRPool.find({ _id: { $in: args.ids } }).select('_id code qrImage').lean();
    },

    qrLookup: async (_: any, args: { code: string }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const code = args.code.toUpperCase();

      // Check if it's in the QR pool
      const qrItem = await QRPool.findOne({ code });
      if (qrItem) {
        if (qrItem.status === 'assigned' && qrItem.customerId) {
          const customer = await Customer.findById(qrItem.customerId);
          return { found: true, status: 'assigned', qrPool: qrItem, customer };
        }
        return { found: true, status: 'available', qrPool: qrItem, customer: null };
      }

      // Check if it's directly a customer code (legacy)
      const customer = await Customer.findOne({ customerCode: code });
      if (customer) {
        return { found: true, status: 'assigned', qrPool: null, customer };
      }

      return { found: false, status: 'unknown', qrPool: null, customer: null };
    },
  },

  Mutation: {
    // AUTH
    login: async (_: any, args: { username: string; password: string }, ctx: GqlContext) => {
      await connectDB();
      const user = await User.findOne({ username: args.username.toLowerCase(), status: 'active' });
      if (!user) return { success: false, message: 'Invalid credentials', user: null };

      const isValid = await bcrypt.compare(args.password, user.passwordHash);
      if (!isValid) return { success: false, message: 'Invalid credentials', user: null };

      ctx.session.user = {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      };
      await ctx.session.save();

      return {
        success: true,
        message: 'Login successful',
        user: { _id: user._id, username: user.username, role: user.role, fullName: user.fullName, email: user.email, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt },
      };
    },

    logout: async (_: any, __: any, ctx: GqlContext) => {
      ctx.session.destroy();
      return { success: true, message: 'Logged out successfully' };
    },

    // USERS
    createUser: async (_: any, args: { input: any }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const { username, password, role, fullName, email } = args.input;

      const existing = await User.findOne({ username: username.toLowerCase() });
      if (existing) throw new GraphQLError('Username already exists');

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ username: username.toLowerCase(), passwordHash, role, fullName, email, status: 'active' });
      return { _id: user._id, username: user.username, role: user.role, fullName: user.fullName, email: user.email, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt };
    },

    updateUser: async (_: any, args: { id: string; input: any }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const updateData: any = { ...args.input };
      if (updateData.password) {
        updateData.passwordHash = await bcrypt.hash(updateData.password, 12);
        delete updateData.password;
      }
      const user = await User.findByIdAndUpdate(args.id, updateData, { new: true }).select('-passwordHash');
      if (!user) throw new GraphQLError('User not found');
      return user;
    },

    deleteUser: async (_: any, args: { id: string }, ctx: GqlContext) => {
      await connectDB();
      const currentUser = requireAdmin(ctx);
      if (args.id === currentUser._id) throw new GraphQLError('Cannot delete your own account');
      await User.findByIdAndDelete(args.id);
      return { success: true, message: 'User deleted successfully' };
    },

    // CUSTOMERS
    createCustomer: async (_: any, args: { input: any }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const customerCode = await generateCustomerCode();
      const fullName = `${args.input.firstName} ${args.input.lastName}`;
      const customer = await Customer.create({ ...args.input, customerCode, fullName, status: args.input.status || 'active' });
      const qrCode = await generateQRCodeData(customerCode);
      customer.qrCode = qrCode;
      await customer.save();
      return customer;
    },

    updateCustomer: async (_: any, args: { id: string; input: any }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const input = { ...args.input };
      if (input.firstName || input.lastName) {
        const existing = await Customer.findById(args.id);
        if (existing) {
          input.fullName = `${input.firstName || existing.firstName} ${input.lastName || existing.lastName}`;
        }
      }
      const customer = await Customer.findByIdAndUpdate(args.id, input, { new: true });
      if (!customer) throw new GraphQLError('Customer not found');
      return customer;
    },

    deleteCustomer: async (_: any, args: { id: string }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      // Release or delete any QR pool entry assigned to this customer
      await QRPool.deleteMany({ customerId: args.id });
      await Customer.findByIdAndDelete(args.id);
      await AttendanceLog.deleteMany({ customerId: args.id });
      return { success: true, message: 'Customer and associated QR codes deleted successfully' };
    },

    generateQRCode: async (_: any, args: { customerId: string }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const customer = await Customer.findById(args.customerId);
      if (!customer) throw new GraphQLError('Customer not found');
      const qrCode = await generateQRCodeData(customer.customerCode);
      customer.qrCode = qrCode;
      await customer.save();
      return { success: true, message: 'QR code generated', qrCode };
    },

    regenerateQRCode: async (_: any, args: { customerId: string }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const customer = await Customer.findById(args.customerId);
      if (!customer) throw new GraphQLError('Customer not found');
      const qrCode = await generateQRCodeData(customer.customerCode);
      customer.qrCode = qrCode;
      await customer.save();
      return { success: true, message: 'QR code regenerated', qrCode };
    },

    // ATTENDANCE
    recordAttendance: async (_: any, args: { input: any }, ctx: GqlContext) => {
      await connectDB();
      const user = requireAuth(ctx);
      const { customerCode, totalAmount, discountUsed, notes } = args.input;
      const customer = await Customer.findOne({ customerCode: customerCode.toUpperCase() });
      if (!customer) throw new GraphQLError('Customer not found');
      if (customer.status !== 'active') throw new GraphQLError('Customer is inactive');

      const finalAmount = totalAmount - (totalAmount * discountUsed / 100);

      const log = await AttendanceLog.create({
        customerId: customer._id,
        customerCode: customer.customerCode,
        totalAmount,
        discountUsed,
        finalAmount: Math.round(finalAmount * 100) / 100,
        scannedBy: user._id,
        scannedAt: new Date(),
        notes,
      });
      return log;
    },

    // QR POOL
    batchGenerateQR: async (_: any, args: { count: number }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);

      const count = Math.min(args.count, 500); // Max 500 per batch
      const batchId = `BATCH-${Date.now()}`;

      // Generate random 8-character alphanumeric codes
      const generateRandomCode = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,O,1,I to avoid confusion
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Ensure uniqueness against existing codes
      const existingCodes = new Set<string>();
      const existingPool = await QRPool.find({}).select('code').lean();
      const existingCustomers = await Customer.find({}).select('customerCode').lean();
      existingPool.forEach((p: any) => existingCodes.add(p.code));
      existingCustomers.forEach((c: any) => existingCodes.add(c.customerCode));

      const items = [];
      const newCodes = new Set<string>();
      for (let i = 0; i < count; i++) {
        let code: string;
        do {
          code = generateRandomCode();
        } while (existingCodes.has(code) || newCodes.has(code));
        newCodes.add(code);

        const qrImage = await generateQRCodeData(code);
        items.push({
          code,
          qrImage,
          status: 'available',
          batchId,
          generatedAt: new Date(),
        });
      }

      await QRPool.insertMany(items);
      const saved = await QRPool.find({ batchId }).sort({ generatedAt: 1 });

      return { success: true, message: `Generated ${count} QR codes`, batchId, count, items: saved };
    },

    registerCustomerToQR: async (_: any, args: { input: any }, ctx: GqlContext) => {
      await connectDB();
      requireAuth(ctx);
      const { code, firstName, lastName, mobile, email, address, defaultDiscount, notes } = args.input;

      // Find the QR in the pool
      const qrItem = await QRPool.findOne({ code: code.toUpperCase(), status: 'available' });
      if (!qrItem) throw new GraphQLError('QR code not found or already assigned');

      // Create the customer with this code
      const fullName = `${firstName} ${lastName}`;
      const customer = await Customer.create({
        customerCode: qrItem.code,
        firstName,
        lastName,
        fullName,
        mobile,
        email,
        address,
        defaultDiscount: defaultDiscount || 0,
        notes,
        qrCode: qrItem.qrImage,
        status: 'active',
      });

      // Mark QR as assigned
      qrItem.status = 'assigned';
      qrItem.customerId = customer._id;
      qrItem.assignedAt = new Date();
      await qrItem.save();

      return customer;
    },

    deleteQRCode: async (_: any, args: { id: string }, ctx: GqlContext) => {
      await connectDB();
      requireAdmin(ctx);
      const qrItem = await QRPool.findById(args.id);
      if (!qrItem) throw new GraphQLError('QR code not found');

      // If assigned, also delete the associated customer and their attendance logs
      if (qrItem.status === 'assigned' && qrItem.customerId) {
        await AttendanceLog.deleteMany({ customerId: qrItem.customerId });
        await Customer.findByIdAndDelete(qrItem.customerId);
      }

      await QRPool.findByIdAndDelete(args.id);
      return { success: true, message: 'QR code deleted successfully' };
    },
  },

  AttendanceLog: {
    customer: async (parent: any) => {
      // If already populated from list query
      if (parent.customer) return parent.customer;
      if (!parent.customerId) return null;
      await connectDB();
      return Customer.findById(parent.customerId).select('fullName customerCode').lean();
    },
    staff: async (parent: any) => {
      // If already populated from list query
      if (parent.staff) return parent.staff;
      if (!parent.scannedBy) return null;
      await connectDB();
      return User.findById(parent.scannedBy).select('fullName username -passwordHash').lean();
    },
  },

  QRPoolItem: {
    customer: async (parent: any) => {
      // If already populated (from list query), return it
      if (parent.customer) return parent.customer;
      if (!parent.customerId) return null;
      await connectDB();
      return Customer.findById(parent.customerId).select('fullName customerCode').lean();
    },
  },
};
