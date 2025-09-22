const mongoose = require('mongoose');

const bookingItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  }
});

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farmer is required']
  },
  items: [bookingItemSchema],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  deliveryAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    }
  },
  deliveryDate: {
    type: Date,
    required: [true, 'Delivery date is required']
  },
  deliveryTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_money'],
    default: 'cash'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  specialInstructions: {
    type: String,
    maxlength: [200, 'Special instructions cannot exceed 200 characters']
  },
  estimatedDeliveryTime: {
    type: Date,
    default: null
  },
  actualDeliveryTime: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    default: 0
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: null
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ customer: 1 });
bookingSchema.index({ farmer: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ deliveryDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for order summary
bookingSchema.virtual('orderSummary').get(function() {
  return {
    totalItems: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: this.totalAmount,
    status: this.status,
    paymentStatus: this.paymentStatus
  };
});

// Virtual for delivery status
bookingSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered';
});

// Virtual for is overdue
bookingSchema.virtual('isOverdue').get(function() {
  if (this.status === 'delivered' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.deliveryDate;
});

// Method to calculate total amount
bookingSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return this.totalAmount;
};

// Method to update item prices
bookingSchema.methods.updateItemPrices = function() {
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.unitPrice;
  });
  this.calculateTotal();
  return this.save();
};

// Method to add item to booking
bookingSchema.methods.addItem = function(productId, quantity, unitPrice) {
  const existingItem = this.items.find(item => item.product.toString() === productId.toString());
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
  } else {
    this.items.push({
      product: productId,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: quantity * unitPrice
    });
  }
  
  this.calculateTotal();
  return this.save();
};

// Method to remove item from booking
bookingSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => item.product.toString() !== productId.toString());
  this.calculateTotal();
  return this.save();
};

// Method to update booking status
bookingSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancellationReason = notes;
  }
  
  return this.save();
};

// Pre-save middleware to validate delivery date
bookingSchema.pre('save', function(next) {
  if (this.deliveryDate && this.deliveryDate < new Date()) {
    const error = new Error('Delivery date cannot be in the past');
    return next(error);
  }
  next();
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.orderSummary = {
      totalItems: ret.items.length,
      totalQuantity: ret.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: ret.totalAmount,
      status: ret.status,
      paymentStatus: ret.paymentStatus
    };
    return ret;
  }
});

module.exports = mongoose.model('Booking', bookingSchema); 