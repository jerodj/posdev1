# POS API Server

A complete REST API server for the Point of Sale system built with Express.js and Supabase.

## Features

- **Authentication**: Staff login with ID and PIN
- **Order Management**: Create, update, and track orders
- **Menu Management**: Fetch menu items and categories
- **Table Management**: Restaurant table status and management
- **Payment Processing**: Handle multiple payment methods
- **Shift Management**: Staff shift tracking with cash reconciliation
- **Dashboard Analytics**: Real-time sales and performance metrics
- **Audit Trail**: Complete action logging for compliance

## API Endpoints

### Authentication
- `POST /auth/login` - Staff login with staff_id and pin

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

### Menu
- `GET /menu/items` - Get all menu items
- `GET /menu/categories` - Get menu categories

### Tables
- `GET /tables` - Get all tables

### Orders
- `GET /orders` - Get orders (with optional filters)
- `POST /orders` - Create new order
- `PUT /orders/:id/status` - Update order status
- `POST /orders/:id/payment` - Process payment

### Shifts
- `POST /shifts/start` - Start a new shift
- `POST /shifts/end` - End current shift
- `GET /shifts/current` - Get current active shift

### Settings
- `GET /settings/business` - Get business settings

### Health
- `GET /health` - Health check endpoint

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
```

4. Run the server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Development

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## Error Handling

All endpoints include comprehensive error handling with:
- Proper HTTP status codes
- Detailed error messages
- Request validation
- Database error handling

## Security

- Row Level Security (RLS) enabled on all Supabase tables
- Input validation on all endpoints
- Audit trail for all actions
- CORS configuration for frontend integration

## Logging

The server includes:
- Request/response logging
- Error logging
- Audit trail creation
- Performance monitoring