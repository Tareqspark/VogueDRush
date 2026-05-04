const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('full_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('role')
    .isIn(['admin', 'waiter', 'kitchen'])
    .withMessage('Role must be admin, waiter, or kitchen'),
  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Order validation
const validateOrder = [
  body('order_type')
    .isIn(['dine_in', 'delivery', 'direct'])
    .withMessage('Order type must be dine_in, delivery, or direct'),
  body('table_id')
    .if(body('order_type').equals('dine_in'))
    .isInt({ min: 1 })
    .withMessage('Table ID is required for dine-in orders'),
  body('customer_name')
    .if(body('order_type').isIn(['delivery', 'direct']))
    .notEmpty()
    .withMessage('Customer name is required for delivery and takeaway orders'),
  body('customer_phone')
    .if(body('order_type').isIn(['delivery', 'direct']))
    .isMobilePhone()
    .withMessage('Valid customer phone is required for delivery and takeaway orders'),
  body('delivery_details.order_time')
    .if(body('order_type').equals('delivery'))
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Order time is required for delivery orders (HH:MM)'),
  body('delivery_details.delivery_time')
    .if(body('order_type').equals('delivery'))
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Delivery time is required for delivery orders (HH:MM)'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.food_item_id')
    .isInt({ min: 1 })
    .withMessage('Valid food item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('special_instructions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special instructions must not exceed 500 characters'),
  handleValidationErrors
];

// Food item validation
const validateFoodItem = [
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('promotional_price')
    .optional({ checkFalsy: true, nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Promotional price must be a positive number'),
  body('vat_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('VAT rate must be between 0 and 100'),
  body('preparation_time')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Preparation time must be at least 1 minute'),
  handleValidationErrors
];

// Food category validation
const validateFoodCategory = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  body('icon')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Icon must not exceed 100 characters'),
  handleValidationErrors
];

// Table validation
const validateTable = [
  body('table_number')
    .isLength({ min: 1, max: 10 })
    .withMessage('Table number must be between 1 and 10 characters')
    .trim(),
  body('capacity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacity must be between 1 and 20'),
  body('location')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Location must not exceed 50 characters'),
  handleValidationErrors
];

// Reservation validation
const validateReservation = [
  body('customer_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters')
    .trim(),
  body('customer_phone')
    .isMobilePhone()
    .withMessage('Valid customer phone is required'),
  body('customer_email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('party_size')
    .isInt({ min: 1, max: 20 })
    .withMessage('Party size must be between 1 and 20'),
  body('reservation_date')
    .isISO8601()
    .withMessage('Valid reservation date is required')
    .custom((value) => {
      const reservationDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reservationDate < today) {
        throw new Error('Reservation date cannot be in the past');
      }
      return true;
    }),
  body('reservation_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid time format is HH:MM')
    .custom((value) => {
      // M-6: enforce DB constraint at application layer — 10:00 to 23:00
      const [hours, minutes] = value.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes < 10 * 60 || totalMinutes > 23 * 60) {
        throw new Error('Reservation time must be between 10:00 and 23:00');
      }
      return true;
    }),
  body('special_requests')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requests must not exceed 500 characters'),
  handleValidationErrors
];

// Delivery details validation
const validateDeliveryDetails = [
  body('customer_address')
    .isLength({ min: 10, max: 500 })
    .withMessage('Customer address must be between 10 and 500 characters')
    .trim(),
  body('delivery_phone')
    .isMobilePhone()
    .withMessage('Valid delivery phone is required'),
  body('advance_payment')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Advance payment must be a positive number'),
  body('delivery_notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Delivery notes must not exceed 500 characters'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// Date range validation for reports
const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (req.query.start_date && value) {
        const startDate = new Date(req.query.start_date);
        const endDate = new Date(value);
        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  handleValidationErrors
];

// System settings validation
const validateSystemSetting = [
  body('setting_key')
    .isLength({ min: 2, max: 100 })
    .withMessage('Setting key must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Setting key can only contain letters, numbers, and underscores'),
  body('setting_value')
    .notEmpty()
    .withMessage('Setting value is required'),
  body('data_type')
    .isIn(['string', 'number', 'boolean', 'json'])
    .withMessage('Data type must be string, number, boolean, or json'),
  handleValidationErrors
];

module.exports = {
  validateUser,
  validateLogin,
  validateOrder,
  validateFoodItem,
  validateFoodCategory,
  validateTable,
  validateReservation,
  validateDeliveryDetails,
  validateId,
  validateDateRange,
  validateSystemSetting,
  handleValidationErrors
};
