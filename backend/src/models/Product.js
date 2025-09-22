const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'eggs', 'herbs', 'flowers', 'other'],
    default: 'other'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'lbs', 'pieces', 'dozen', 'bunch', 'bag', 'box', 'liter', 'gallon'],
    default: 'kg'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farmer is required']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v) || /^data:image\/.+/.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  plantingDate: {
    type: Date,
    default: null
  },
  harvestDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['growing', 'ready', 'harvested', 'sold', 'expired'],
    default: 'ready'
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  minOrderQuantity: {
    type: Number,
    min: [0, 'Minimum order quantity cannot be negative'],
    default: 1
  },
  maxOrderQuantity: {
    type: Number,
    min: [0, 'Maximum order quantity cannot be negative'],
    default: 100
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ farmer: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isAvailable: 1 });
productSchema.index({ location: '2dsphere' });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.cost > 0) {
    return ((this.price - this.cost) / this.cost * 100).toFixed(2);
  }
  return 0;
});

// Virtual for total value
productSchema.virtual('totalValue').get(function() {
  return this.quantity * this.price;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function(requestedQuantity = 1) {
  return this.isAvailable && this.quantity >= requestedQuantity;
};

// Method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'add') {
    this.quantity += quantity;
  } else if (operation === 'subtract') {
    if (this.quantity < quantity) {
      throw new Error('Insufficient stock');
    }
    this.quantity -= quantity;
  }
  
  // Update availability status
  this.isAvailable = this.quantity > 0;
  
  return this.save();
};

// Pre-save middleware to update status based on dates
productSchema.pre('save', function(next) {
  const now = new Date();
  
  // Update status based on dates
  if (this.expiryDate && now > this.expiryDate) {
    this.status = 'expired';
    this.isAvailable = false;
  } else if (this.harvestDate && now >= this.harvestDate && this.status === 'growing') {
    this.status = 'ready';
  }
  
  next();
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.profitMargin = parseFloat(ret.profitMargin);
    ret.totalValue = parseFloat(ret.totalValue);
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema); 