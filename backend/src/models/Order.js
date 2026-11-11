import mongoose from 'mongoose';

export const ORDER_STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    landmark: { type: String, default: '' },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    byName: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item' },
    },
    shippingAddress: { type: addressSchema, required: true },
    notes: { type: String, default: '' },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment' },
    expiresAt: { type: Date },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    statusHistory: { type: [statusHistorySchema], default: [] },

    payment: {
      provider: { type: String, default: 'paystack' },
      attemptedReferences: { type: [String], default: [] },
      paidReference: { type: String },
      paidAmount: { type: Number },
      channel: { type: String },
      needsRefund: { type: Boolean, default: false },
      refundReason: { type: String, default: '' },
      refundedAt: { type: Date },
      refundNote: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.attemptedReferences': 1 });

export default mongoose.model('Order', orderSchema);