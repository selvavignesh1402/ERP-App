// Public API contracts. Keep field changes paired with backend response-contract tests.
export interface UserProfile {
    userId: number | null;
    email: string | null;
    location: string | null;
    registerNumber: string | null;
    gstNo: string | null;
}
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type DeliveryFailureReason =
    'SHOP_CLOSED' | 'CUSTOMER_UNAVAILABLE' | 'GOODS_REJECTED' | 'ADDRESS_ISSUE' | 'PAYMENT_DISPUTE' | 'OTHER';
export type DeliveryStatus =
    'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'FAILED' | 'CANCELLED';
export type InvoiceStatus = 'RECEIVED' | 'MATCHED' | 'MISMATCHED' | 'PAID';
export type MovementType = 'PURCHASE_RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'OPENING_STOCK';
export type OrgRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
export type PlatformRole = 'MASTER_ADMIN' | 'USER';
export type PriceType = 'PURCHASE' | 'SELLING';
export type PurchaseStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ORDERED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'COMPLETED'
    | 'CANCELLED';
export type ReconciliationStatus = 'MATCHED' | 'MISMATCHED';
export type ReferenceType = 'SALE' | 'PURCHASE' | 'CUSTOMER' | 'SUPPLIER';
export type SalesOrderStatus =
    | 'DRAFT'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'READY_FOR_DELIVERY'
    | 'OUT_FOR_DELIVERY'
    | 'PARTIALLY_DELIVERED'
    | 'DELIVERED'
    | 'CANCELLED';
export type Status = 'ACTIVE' | 'INACTIVE';
export type VisitOutcome =
    | 'ORDER_PLACED'
    | 'PAYMENT_COLLECTED'
    | 'BOTH'
    | 'NO_ORDER'
    | 'SHOP_CLOSED'
    | 'CUSTOMER_UNAVAILABLE'
    | 'FOLLOW_UP';
export type VisitStatus = 'PENDING' | 'COMPLETED' | 'MISSED';

export interface BeatPlanEntry {
    id: number | null;
    dayOfWeek: DayOfWeek;
    customer: Customer | null;
    visitOrder: number;
    organizationId: number | null;
}

export interface BeatPlan {
    id: number | null;
    name: string | null;
    salesperson: User | null;
    active: boolean;
    createdAt: string | null;
    entries: BeatPlanEntry[];
    organizationId: number | null;
}

export interface Customer {
    id: number | null;
    organizationId: number | null;
    customerName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    gstNumber: string | null;
    creditLimit: number;
    creditBalance: number;
    status: Status;
    createdAt: string | null;
}

export interface DeliveryItem {
    id: number | null;
    product: Product | null;
    orderedQuantity: number;
    deliveringQuantity: number;
    deliveredQuantity: number;
    unitPrice: number;
}

export interface Delivery {
    id: number | null;
    deliveryNumber: string | null;
    salesOrder: SalesOrder | null;
    deliveryPerson: User | null;
    vehicleNumber: string | null;
    status: DeliveryStatus;
    assignedAt: string | null;
    startedAt: string | null;
    deliveredAt: string | null;
    receiverName: string | null;
    receiverPhone: string | null;
    deliveryNotes: string | null;
    failureReason: DeliveryFailureReason;
    items: DeliveryItem[];
    generatedInvoiceId: number | null;
    organizationId: number | null;
}

export interface GoodsReceiptItem {
    id: number | null;
    product: Product | null;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    organizationId: number | null;
}

export interface GoodsReceipt {
    id: number | null;
    purchase: Purchase | null;
    receiptNumber: string | null;
    receivedDate: string | null;
    createdAt: string | null;
    organizationId: number | null;
}

export interface Payment {
    id: number | null;
    organizationId: number | null;
    clientReferenceId: string | null;
    referenceType: ReferenceType;
    referenceId: number | null;
    amount: number;
    paymentMode: PaymentMode;
    paymentDate: string | null;
    openingBalanceAmount: number | null;
    saleAllocations: Record<string, number>;
}

export interface PriceHistory {
    id: number | null;
    product: Product | null;
    priceType: PriceType;
    price: number;
    effectiveFrom: string | null;
    organizationId: number | null;
}

export interface Product {
    reservedStock: number | null;
    availableStock: number | null;
    id: number | null;
    productName: string | null;
    category: string | null;
    brand: string | null;
    unit: string | null;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    minimumStock: number;
    gstRate: number | null;
    hsnCode: string | null;
    status: Status;
    createdAt: string | null;
    organizationId: number | null;
}

export interface PurchaseItem {
    id: number | null;
    product: Product | null;
    quantity: number;
    price: number;
    organizationId: number | null;
}

export interface Purchase {
    id: number | null;
    supplier: Supplier | null;
    invoiceNumber: string | null;
    purchaseDate: string | null;
    totalAmount: number;
    status: PurchaseStatus;
    createdAt: string | null;
    organizationId: number | null;
}

export interface PurchaseReturn {
    id: number | null;
    purchase: Purchase | null;
    product: Product | null;
    quantityReturned: number;
    reason: string | null;
    returnDate: string | null;
    organizationId: number | null;
}

export interface ReconciliationResult {
    id: number | null;
    purchase: Purchase | null;
    invoice: SupplierInvoice | null;
    status: ReconciliationStatus;
    amountMatched: number;
    amountOnPurchase: number;
    amountOnInvoice: number;
    details: string | null;
    reconciledAt: string | null;
    organizationId: number | null;
}

export interface SaleItem {
    gstRate?: number | null;
    productName: string | null;
    unit: string | null;
    id: number | null;
    product: Product | null;
    quantity: number;
    price: number;
    organizationId: number | null;
}

export interface Sale {
    taxType?: 'INTRA_STATE' | 'INTER_STATE';
    id: number | null;
    organizationId: number | null;
    billNumber: string | null;
    customer: Customer | null;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    shopName: string | null;
    saleDate: string | null;
    paymentMode: PaymentMode;
    total: number;
    discount: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    paidAmount: number | null;
    balanceDue: number | null;
    clientReferenceId: string | null;
    salesOrderId: number | null;
    deliveryId: number | null;
    createdAt: string | null;
}

export interface SalesOrderItem {
    gstRate?: number | null;
    id: number | null;
    product: Product | null;
    orderedQuantity: number;
    packedQuantity: number;
    deliveredQuantity: number;
    remainingQuantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface SalesOrder {
    taxType?: 'INTRA_STATE' | 'INTER_STATE';
    id: number | null;
    orderNumber: string | null;
    customer: Customer | null;
    salesperson: User | null;
    orderDate: string | null;
    expectedDeliveryDate: string | null;
    status: SalesOrderStatus;
    subtotal: number;
    discount: number;
    taxAmount: number;
    grandTotal: number;
    notes: string | null;
    items: SalesOrderItem[];
    createdAt: string | null;
    updatedAt: string | null;
    organizationId: number | null;
}

export interface StockAdjustment {
    id: number | null;
    product: Product | null;
    quantityChange: number;
    reason: string | null;
    adjustedAt: string | null;
    organizationId: number | null;
}

export interface StockMovement {
    id: number | null;
    product: Product | null;
    movementType: MovementType;
    quantity: number;
    referenceId: number | null;
    createdAt: string | null;
    organizationId: number | null;
}

export interface SupplierInvoiceItem {
    id: number | null;
    product: Product | null;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    organizationId: number | null;
}

export interface SupplierInvoice {
    id: number | null;
    invoiceNumber: string | null;
    supplier: Supplier | null;
    purchase: Purchase | null;
    invoiceDate: string | null;
    totalAmount: number;
    status: InvoiceStatus;
    createdAt: string | null;
    organizationId: number | null;
}

export interface SupplierProduct {
    id: number | null;
    product: Product | null;
    purchasePrice: number;
    leadTimeDays: number | null;
    minOrderQty: number;
    organizationId: number | null;
}

export interface Supplier {
    id: number | null;
    supplierName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    gstNumber: string | null;
    rating: number;
    category: string | null;
    status: Status;
    createdAt: string | null;
    organizationId: number | null;
}

export interface User {
    id: number | null;
    phoneNumber: string | null;
    name: string | null;
    profileCompleted: boolean;
    active: boolean;
    createdAt: string | null;
    platformRole: PlatformRole;
}

export interface VisitCheckIn {
    id: number | null;
    visitSchedule: VisitSchedule | null;
    salesperson: User | null;
    customer: Customer | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    latitude: number | null;
    longitude: number | null;
    outcome: VisitOutcome;
    notes: string | null;
    saleId: number | null;
    paymentId: number | null;
    organizationId: number | null;
}

export interface VisitSchedule {
    id: number | null;
    beatPlan: BeatPlan | null;
    salesperson: User | null;
    customer: Customer | null;
    scheduledDate: string | null;
    visitOrder: number;
    status: VisitStatus;
    organizationId: number | null;
}
