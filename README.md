# FoodPark - Restaurant Management System

A comprehensive restaurant management system built with modern web technologies, featuring real-time updates, role-based access control, and a beautiful dark theme with orange/lemon accents.

## 🚀 Features

### Core Functionality
- **Authentication & User Management**: JWT-based auth with role-based access (Admin/Waiter)
- **Order Management**: Complete order pipeline (Dine-in, Delivery, Direct) with real-time status tracking
- **Kitchen Management**: Real-time kitchen display system with queue management
- **Table Management**: Table status tracking and reservation system
- **Menu Management**: Food categories, items, pricing with promotional support
- **Delivery Management**: Order tracking, payment collection, and delivery status
- **Reservations**: Booking system with table availability checking
- **Reporting & Analytics**: Comprehensive sales, performance, and operational reports
- **System Administration**: Configurable settings, audit logs, and data export

### Technical Features
- **Real-time Updates**: WebSocket integration for live order and kitchen updates
- **Responsive Design**: Mobile-friendly interface with touch support
- **Dark Theme**: Beautiful dark theme with orange/lemon accent colors
- **Role-based UI**: Different interfaces for Admin and Waiter roles
- **Audit Trail**: Complete audit logging for all system changes
- **Data Export**: CSV export functionality for reports and data

## 🛠 Tech Stack

### Backend
- **Node.js** with **Express.js** (REST API)
- **MySQL** (Database)
- **JWT** (Authentication)
- **Socket.io** (Real-time communication)
- **bcryptjs** (Password hashing)
- **express-validator** (Input validation)

### Frontend
- **React 18** (UI Framework)
- **React Router** (Navigation)
- **Tailwind CSS** (Styling)
- **React Query** (Data fetching)
- **React Hook Form** (Form handling)
- **Socket.io Client** (Real-time updates)
- **Heroicons** (Icons)
- **React Hot Toast** (Notifications)

## 📋 System Requirements

- Node.js 16.0 or higher
- MySQL 8.0 or higher
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd foodpark
```

### 2. Database Setup
```bash
# Create database and import schema
mysql -u root -p < database/schema.sql
```

### 3. Backend Setup
```bash
cd backend
npm install

# Copy environment file and configure
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=foodpark
# DB_USER=root
# DB_PASSWORD=your_password

# Start the backend server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start the frontend development server
npm start
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 🔐 Default Login Credentials

### Admin Account
- **Username**: admin
- **Password**: admin123

### Waiter Account
- **Username**: waiter
- **Password**: waiter123

## 📁 Project Structure

```
foodpark/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── audit.js             # Audit logging
│   │   └── validation.js        # Input validation
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management
│   │   ├── orders.js            # Order management
│   │   ├── menu.js              # Menu management
│   │   ├── tables.js            # Table management
│   │   ├── reservations.js      # Reservations
│   │   ├── kitchen.js           # Kitchen management
│   │   ├── delivery.js          # Delivery management
│   │   ├── reports.js           # Reports & analytics
│   │   └── settings.js          # System settings
│   ├── server.js                # Main server file
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/       # Dashboard components
│   │   │   ├── Layout/          # Layout components
│   │   │   └── UI/              # Reusable UI components
│   │   ├── contexts/
│   │   │   ├── AuthContext.js    # Authentication context
│   │   │   └── SocketContext.js  # Socket.io context
│   │   ├── pages/
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Dashboard.js      # Main dashboard
│   │   │   ├── Orders.js         # Order management
│   │   │   ├── Kitchen.js        # Kitchen display
│   │   │   ├── Tables.js         # Table management
│   │   │   ├── Menu.js           # Menu management
│   │   │   ├── Reservations.js   # Reservations
│   │   │   ├── Delivery.js       # Delivery management
│   │   │   ├── Users.js          # User management
│   │   │   ├── Reports.js        # Reports
│   │   │   ├── Settings.js       # Settings
│   │   │   └── Profile.js        # User profile
│   │   ├── App.js                # Main App component
│   │   └── index.css             # Global styles
│   ├── tailwind.config.js        # Tailwind configuration
│   └── package.json
├── database/
│   └── schema.sql                # Database schema
└── README.md
```

## 🔧 Configuration

### Environment Variables (Backend)
Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=foodpark
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### Environment Variables (Frontend)
Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🎨 Theme Customization

The application uses a dark theme with orange/lemon accents. Colors are defined in `tailwind.config.js`:

- **Primary Accent**: Orange (#f97316)
- **Secondary Accent**: Lemon (#eab308)
- **Dark Theme**: Multiple shades of gray for backgrounds and text
- **Status Colors**: Defined for different order and table statuses

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### Orders
- `GET /api/orders` - Get orders with filtering
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status

### Kitchen
- `GET /api/kitchen` - Get kitchen queue
- `PATCH /api/kitchen/:id/start` - Start preparation
- `PATCH /api/kitchen/:id/ready` - Mark as ready

### Other endpoints available for users, tables, menu, reservations, delivery, reports, and settings.

## 🔌 Real-time Features

The system uses Socket.io for real-time updates:

- **Order Updates**: Live order status changes
- **Kitchen Updates**: Real-time kitchen queue updates
- **Table Updates**: Table status changes
- **Reservation Updates**: New and updated reservations
- **Delivery Updates**: Delivery status and payment updates

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## 📈 Performance Features

- Database connection pooling
- Query optimization
- Caching with React Query
- Lazy loading components
- Optimized re-renders
- Image optimization

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 Audit Trail

All system changes are logged in the `audit_logs` table:
- User actions
- Data modifications
- Login/logout events
- Configuration changes

## 📊 Reports Available

- **Sales Reports**: Daily, weekly, monthly revenue
- **Menu Performance**: Item and category analytics
- **Staff Performance**: Sales per employee
- **Delivery Reports**: Delivery metrics and analytics
- **Cancellation Reports**: Order cancellation analysis
- **Payment Reports**: Payment method analysis

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Check the console for errors
- Ensure all environment variables are set correctly

## 🔄 Updates and Maintenance

- Regular database backups recommended
- Update dependencies regularly
- Monitor system logs
- Review audit logs periodically
- Update JWT secrets periodically

---

**FoodPark** - Modern Restaurant Management System
Built with ❤️ using React, Node.js, and MySQL
# FoodPark
