const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Booking = require('../models/Booking');
const Product = require('../models/Product');
const { auth, isFarmer, isCustomer } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings (filtered by user role)
// @access  Private
router.get('/', [
  auth,
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      status,
      paymentStatus,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    // Filter by user role
    if (req.user.role === 'farmer') {
      filter.farmer = req.user.userId;
    } else if (req.user.role === 'customer') {
      filter.customer = req.user.userId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('farmer', 'firstName lastName email phone')
      .populate({
        path: 'items.product',
        select: 'name category price images'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking by ID
// @access  Private (Booking owner or farmer)
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('farmer', 'firstName lastName email phone address')
      .populate({
        path: 'items.product',
        select: 'name category price images description'
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    if (booking.customer._id.toString() !== req.user.userId && 
        booking.farmer._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private (Customers only)
router.post('/', [
  auth,
  isCustomer,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').isObject().withMessage('Delivery address is required'),
  body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('deliveryAddress.country').notEmpty().withMessage('Country is required'),
  body('deliveryDate').isISO8601().withMessage('Valid delivery date is required'),
  body('deliveryTime').optional().isIn(['morning', 'afternoon', 'evening', 'anytime']),
  body('paymentMethod').optional().isIn(['cash', 'card', 'bank_transfer', 'mobile_money']),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('specialInstructions').optional().isLength({ max: 200 }).withMessage('Special instructions cannot exceed 200 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { items, deliveryAddress, deliveryDate, deliveryTime, paymentMethod, notes, specialInstructions } = req.body;

    // Validate delivery date is in the future
    const deliveryDateTime = new Date(deliveryDate);
    if (deliveryDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Delivery date must be in the future'
      });
    }

    // Validate products and check stock
    const bookingItems = [];
    let totalAmount = 0;
    let farmerId = null;

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (!product.isAvailable || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      if (item.quantity < product.minOrderQuantity || item.quantity > product.maxOrderQuantity) {
        return res.status(400).json({
          success: false,
          message: `Quantity for ${product.name} must be between ${product.minOrderQuantity} and ${product.maxOrderQuantity}`
        });
      }

      // Set farmer ID (all products should be from the same farmer)
      if (!farmerId) {
        farmerId = product.farmer;
      } else if (farmerId.toString() !== product.farmer.toString()) {
        return res.status(400).json({
          success: false,
          message: 'All products must be from the same farmer'
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      bookingItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });
    }

    // Create booking
    const booking = new Booking({
      customer: req.user.userId,
      farmer: farmerId,
      items: bookingItems,
      totalAmount,
      deliveryAddress,
      deliveryDate: deliveryDateTime,
      deliveryTime: deliveryTime || 'anytime',
      paymentMethod: paymentMethod || 'cash',
      notes,
      specialInstructions
    });

    await booking.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity }
      });
    }

    // Update product availability if stock becomes 0
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product.quantity <= 0) {
        product.isAvailable = false;
        await product.save();
      }
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('farmer', 'firstName lastName email phone')
      .populate({
        path: 'items.product',
        select: 'name category price images'
      });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: populatedBooking
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (Farmer only)
router.put('/:id/status', [
  auth,
  isFarmer,
  body('status').isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 200 }).withMessage('Notes cannot exceed 200 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;

    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the farmer for this booking
    if (booking.farmer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update status
    await booking.updateStatus(status, notes);

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('farmer', 'firstName lastName email phone')
      .populate({
        path: 'items.product',
        select: 'name category price images'
      });

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: {
        booking: updatedBooking
      }
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
});

// @route   PUT /api/bookings/:id/payment
// @desc    Update payment status
// @access  Private (Farmer only)
router.put('/:id/payment', [
  auth,
  isFarmer,
  body('paymentStatus').isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { paymentStatus, refundAmount } = req.body;

    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the farmer for this booking
    if (booking.farmer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Update payment status
    booking.paymentStatus = paymentStatus;
    if (refundAmount) {
      booking.refundAmount = refundAmount;
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        booking: {
          id: booking._id,
          paymentStatus: booking.paymentStatus,
          refundAmount: booking.refundAmount
        }
      }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
});

// @route   POST /api/bookings/:id/review
// @desc    Add review to delivered booking
// @access  Private (Customer only)
router.post('/:id/review', [
  auth,
  isCustomer,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { rating, review } = req.body;

    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the customer for this booking
    if (booking.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking'
      });
    }

    // Check if booking is delivered
    if (booking.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only review delivered bookings'
      });
    }

    // Check if already reviewed
    if (booking.rating) {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been reviewed'
      });
    }

    // Add review
    booking.rating = rating;
    if (review) {
      booking.review = review;
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        booking: {
          id: booking._id,
          rating: booking.rating,
          review: booking.review
        }
      }
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review'
    });
  }
});

module.exports = router; 