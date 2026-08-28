import { gql } from '@apollo/client';

// ==================== CUSTOMERS ====================
export const GET_CUSTOMERS = gql`
  query GetCustomers($filter: CustomerFilterInput) {
    customers(filter: $filter) {
      customers {
        _id
        customerCode
        firstName
        lastName
        fullName
        mobile
        email
        address
        defaultDiscount
        notes
        qrCode
        photo
        status
        lastVisit
        totalVisits
        createdAt
        updatedAt
      }
      total
      page
      pageSize
    }
  }
`;

export const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      _id
      customerCode
      firstName
      lastName
      fullName
      mobile
      email
      address
      defaultDiscount
      notes
      qrCode
      photo
      status
      lastVisit
      totalVisits
      createdAt
      updatedAt
    }
  }
`;

export const GET_CUSTOMER_BY_CODE = gql`
  query GetCustomerByCode($code: String!) {
    customerByCode(code: $code) {
      _id
      customerCode
      firstName
      lastName
      fullName
      mobile
      email
      defaultDiscount
      qrCode
      status
      lastVisit
      totalVisits
      createdAt
    }
  }
`;

export const SEARCH_CUSTOMERS = gql`
  query SearchCustomers($query: String!) {
    searchCustomers(query: $query) {
      _id
      customerCode
      fullName
      mobile
      status
    }
  }
`;

export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      _id
      customerCode
      fullName
      status
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      _id
      customerCode
      firstName
      lastName
      fullName
      mobile
      email
      address
      defaultDiscount
      notes
      photo
      status
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id) {
      success
      message
    }
  }
`;

// ==================== QR CODE ====================
export const GENERATE_QR_CODE = gql`
  mutation GenerateQRCode($customerId: ID!) {
    generateQRCode(customerId: $customerId) {
      success
      message
      qrCode
    }
  }
`;

// ==================== ATTENDANCE ====================
export const GET_ATTENDANCE_LOGS = gql`
  query GetAttendanceLogs($filter: AttendanceFilterInput, $page: Int, $pageSize: Int) {
    attendanceLogs(filter: $filter, page: $page, pageSize: $pageSize) {
      logs {
        _id
        customerId
        customerCode
        customer {
          fullName
        }
        totalAmount
        discountUsed
        finalAmount
        scannedBy
        staff {
          fullName
        }
        scannedAt
        notes
      }
      total
      page
      pageSize
    }
  }
`;

export const GET_CUSTOMER_ATTENDANCE = gql`
  query GetCustomerAttendance($customerId: ID!, $page: Int, $pageSize: Int) {
    customerAttendance(customerId: $customerId, page: $page, pageSize: $pageSize) {
      logs {
        _id
        customerCode
        totalAmount
        discountUsed
        finalAmount
        staff {
          fullName
        }
        scannedAt
        notes
      }
      total
      page
      pageSize
    }
  }
`;

export const RECORD_ATTENDANCE = gql`
  mutation RecordAttendance($input: RecordAttendanceInput!) {
    recordAttendance(input: $input) {
      _id
      customerCode
      totalAmount
      discountUsed
      finalAmount
      scannedAt
      notes
    }
  }
`;

// ==================== DASHBOARD ====================
export const GET_DASHBOARD_SUMMARY = gql`
  query GetDashboardSummary {
    dashboardSummary {
      totalCustomers
      todayAttendance
      monthlyAttendance
      activeCustomers
      averageDiscount
      dailyAttendance {
        date
        count
      }
      monthlyAttendanceChart {
        month
        count
      }
      topReturningCustomers {
        customerId
        customerCode
        fullName
        visits
      }
    }
  }
`;

// ==================== USERS ====================
export const GET_USERS = gql`
  query GetUsers {
    users {
      _id
      username
      role
      fullName
      email
      status
      createdAt
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      _id
      username
      role
      fullName
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      _id
      username
      role
      fullName
      email
      status
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

// ==================== REPORTS ====================
export const GET_CUSTOMER_REPORTS = gql`
  query GetCustomerReports {
    customerReports {
      customerId
      customerCode
      fullName
      totalVisits
      averageDiscount
      totalRevenue
      totalDiscountAmount
      lastVisit
    }
  }
`;

// ==================== QR POOL ====================
export const ADD_QR_CODE = gql`
  mutation AddQRCode($code: String!) {
    addQRCode(code: $code) {
      success
      message
      qrCode
    }
  }
`;

export const GET_QR_POOL = gql`
  query GetQRPool($status: QRPoolStatus, $batchId: String, $search: String, $page: Int, $pageSize: Int) {
    qrPool(status: $status, batchId: $batchId, search: $search, page: $page, pageSize: $pageSize) {
      items {
        _id
        code
        status
        customerId
        customer {
          fullName
        }
        batchId
        generatedAt
        assignedAt
      }
      total
      page
      pageSize
    }
  }
`;

export const GET_QR_POOL_IMAGES = gql`
  query GetQRPoolCodes($ids: [ID!]!) {
    qrPool(page: 1, pageSize: 200) {
      items {
        _id
        code
      }
    }
  }
`;

export const QR_LOOKUP = gql`
  query QRLookup($code: String!) {
    qrLookup(code: $code) {
      found
      status
      qrPool {
        _id
        code
        status
      }
      customer {
        _id
        customerCode
        fullName
        firstName
        lastName
        mobile
        email
        defaultDiscount
        status
        lastVisit
        totalVisits
      }
    }
  }
`;

export const BATCH_GENERATE_QR = gql`
  mutation BatchGenerateQR($count: Int!) {
    batchGenerateQR(count: $count) {
      success
      message
      batchId
      count
      codes
    }
  }
`;

export const REGISTER_CUSTOMER_TO_QR = gql`
  mutation RegisterCustomerToQR($input: RegisterCustomerToQRInput!) {
    registerCustomerToQR(input: $input) {
      _id
      customerCode
      fullName
      firstName
      lastName
      mobile
      email
      defaultDiscount
      status
      qrCode
    }
  }
`;

export const DELETE_QR_CODE = gql`
  mutation DeleteQRCode($id: ID!) {
    deleteQRCode(id: $id) {
      success
      message
    }
  }
`;
