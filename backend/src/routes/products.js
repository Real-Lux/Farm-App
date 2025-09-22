const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth, isFarmer } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (with filtering and pagination)
// @access  Public
router.get('/', [
  query('category').optional().isIn(['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'eggs', 'herbs', 'flowers', 'other']),
  query('status').optional().isIn(['growing', 'ready', 'harvested', 'sold', 'expired']),
  query('isAvailable').optional().isBoolean(),
  query('farmer').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'harvestDate']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      category,
      status,
      isAvailable,
      farmer,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (farmer) filter.farmer = farmer;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const products = await Product.find(filter)
      .populate('farmer', 'firstName lastName email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'firstName lastName email phone address');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product
      }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Farmers only)
router.post('/', [
  auth,
  isFarmer,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('category').isIn(['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'eggs', 'herbs', 'flowers', 'other']).withMessage('Invalid category'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit').isIn(['kg', 'lbs', 'pieces', 'dozen', 'bunch', 'bag', 'box', 'liter', 'gallon']).withMessage('Invalid unit'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('plantingDate').optional().isISO8601().withMessage('Invalid planting date'),
  body('harvestDate').optional().isISO8601().withMessage('Invalid harvest date'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
  body('isOrganic').optional().isBoolean().withMessage('isOrganic must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('minOrderQuantity').optional().isInt({ min: 1 }).withMessage('Minimum order quantity must be at least 1'),
  body('maxOrderQuantity').optional().isInt({ min: 1 }).withMessage('Maximum order quantity must be at least 1')
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

    const productData = {
      ...req.body,
      farmer: req.user.userId
    };

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('farmer', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: populatedProduct
      }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Product owner only)
router.put('/:id', [
  auth,
  isFarmer,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('category').optional().isIn(['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'eggs', 'herbs', 'flowers', 'other']).withMessage('Invalid category'),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit').optional().isIn(['kg', 'lbs', 'pieces', 'dozen', 'bunch', 'bag', 'box', 'liter', 'gallon']).withMessage('Invalid unit'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('plantingDate').optional().isISO8601().withMessage('Invalid planting date'),
  body('harvestDate').optional().isISO8601().withMessage('Invalid harvest date'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
  body('isOrganic').optional().isBoolean().withMessage('isOrganic must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('minOrderQuantity').optional().isInt({ min: 1 }).withMessage('Minimum order quantity must be at least 1'),
  body('maxOrderQuantity').optional().isInt({ min: 1 }).withMessage('Maximum order quantity must be at least 1')
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

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product
    if (product.farmer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update product
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    });

    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate('farmer', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: updatedProduct
      }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Product owner only)
router.delete('/:id', auth, isFarmer, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product
    if (product.farmer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});

// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private (Product owner only)
router.put('/:id/stock', [
  auth,
  isFarmer,
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('operation').optional().isIn(['add', 'subtract', 'set']).withMessage('Operation must be add, subtract, or set')
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

    const { quantity, operation = 'set' } = req.body;

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product
    if (product.farmer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update stock based on operation
    if (operation === 'add') {
      product.quantity += quantity;
    } else if (operation === 'subtract') {
      if (product.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }
      product.quantity -= quantity;
    } else if (operation === 'set') {
      product.quantity = quantity;
    }

    // Update availability status
    product.isAvailable = product.quantity > 0;

    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        product: {
          id: product._id,
          quantity: product.quantity,
          isAvailable: product.isAvailable
        }
      }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock'
    });
  }
});

module.exports = router; 