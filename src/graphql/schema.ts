import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum Role {
    admin
    staff
  }

  enum Status {
    active
    inactive
  }

  type User {
    _id: ID!
    username: String!
    role: Role!
    fullName: String!
    email: String
    status: Status!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Customer {
    _id: ID!
    customerCode: String!
    firstName: String!
    lastName: String!
    fullName: String!
    mobile: String
    email: String
    address: String
    defaultDiscount: Float!
    notes: String
    qrCode: String
    photo: String
    status: Status!
    lastVisit: DateTime
    totalVisits: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AttendanceLog {
    _id: ID!
    customerId: ID!
    customerCode: String!
    customer: Customer
    totalAmount: Float
    discountUsed: Float!
    finalAmount: Float
    scannedBy: ID!
    staff: User
    scannedAt: DateTime!
    notes: String
    createdAt: DateTime!
  }

  type DashboardSummary {
    totalCustomers: Int!
    todayAttendance: Int!
    monthlyAttendance: Int!
    activeCustomers: Int!
    averageDiscount: Float!
    dailyAttendance: [DailyAttendance!]!
    monthlyAttendanceChart: [MonthlyAttendance!]!
    topReturningCustomers: [TopCustomer!]!
  }

  type DailyAttendance {
    date: String!
    count: Int!
  }

  type MonthlyAttendance {
    month: String!
    count: Int!
  }

  type TopCustomer {
    customerId: ID!
    customerCode: String!
    fullName: String!
    visits: Int!
  }

  type AuthPayload {
    success: Boolean!
    message: String!
    user: User
  }

  type CustomerListResult {
    customers: [Customer!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type AttendanceListResult {
    logs: [AttendanceLog!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type CustomerReport {
    customerId: ID!
    customerCode: String!
    fullName: String!
    totalVisits: Int!
    averageDiscount: Float!
    totalRevenue: Float!
    totalDiscountAmount: Float!
    lastVisit: DateTime
  }

  type MutationResponse {
    success: Boolean!
    message: String!
  }

  type QRCodeResponse {
    success: Boolean!
    message: String!
    qrCode: String
  }

  # ==================== QR POOL ====================
  enum QRPoolStatus {
    available
    assigned
  }

  type QRPoolItem {
    _id: ID!
    code: String!
    status: QRPoolStatus!
    customerId: ID
    customer: Customer
    batchId: String!
    generatedAt: DateTime!
    assignedAt: DateTime
  }

  type QRPoolListResult {
    items: [QRPoolItem!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type BatchGenerateResult {
    success: Boolean!
    message: String!
    batchId: String!
    count: Int!
    codes: [String!]!
  }

  type QRLookupResult {
    found: Boolean!
    status: String!
    qrPool: QRPoolItem
    customer: Customer
  }

  input RegisterCustomerToQRInput {
    code: String!
    firstName: String!
    lastName: String!
    mobile: String
    email: String
    address: String
    defaultDiscount: Float
    notes: String
  }

  input CreateCustomerInput {
    firstName: String!
    lastName: String!
    mobile: String
    email: String
    address: String
    defaultDiscount: Float
    notes: String
    photo: String
    status: Status
  }

  input UpdateCustomerInput {
    firstName: String
    lastName: String
    mobile: String
    email: String
    address: String
    defaultDiscount: Float
    notes: String
    photo: String
    status: Status
  }

  input RecordAttendanceInput {
    customerCode: String!
    totalAmount: Float!
    discountUsed: Float!
    notes: String
  }

  input CreateUserInput {
    username: String!
    password: String!
    role: Role!
    fullName: String!
    email: String
  }

  input UpdateUserInput {
    username: String
    password: String
    role: Role
    fullName: String
    email: String
    status: Status
  }

  input AttendanceFilterInput {
    startDate: DateTime
    endDate: DateTime
    customerId: ID
    staffId: ID
    customerCode: String
  }

  input CustomerFilterInput {
    search: String
    status: Status
    page: Int
    pageSize: Int
    sortField: String
    sortOrder: String
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
    customers(filter: CustomerFilterInput): CustomerListResult!
    customer(id: ID!): Customer
    customerByCode(code: String!): Customer
    searchCustomers(query: String!): [Customer!]!
    attendanceLogs(filter: AttendanceFilterInput, page: Int, pageSize: Int): AttendanceListResult!
    customerAttendance(customerId: ID!, page: Int, pageSize: Int): AttendanceListResult!
    dashboardSummary: DashboardSummary!
    customerReports: [CustomerReport!]!
    qrPool(status: QRPoolStatus, batchId: String, search: String, page: Int, pageSize: Int): QRPoolListResult!
    qrLookup(code: String!): QRLookupResult!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
    logout: MutationResponse!
    changePassword(currentPassword: String!, newPassword: String!): MutationResponse!
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): MutationResponse!
    createCustomer(input: CreateCustomerInput!): Customer!
    updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
    deleteCustomer(id: ID!): MutationResponse!
    generateQRCode(customerId: ID!): QRCodeResponse!
    recordAttendance(input: RecordAttendanceInput!): AttendanceLog!
    batchGenerateQR(count: Int!): BatchGenerateResult!
    registerCustomerToQR(input: RegisterCustomerToQRInput!): Customer!
    deleteQRCode(id: ID!): MutationResponse!
  }
`;
