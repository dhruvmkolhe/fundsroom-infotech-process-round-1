# Full-Stack Wholesale ERP & CRM System

A production-ready full-stack Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) system designed for wholesale and distribution enterprises. Built with Node.js, Express, TypeScript, SQLite, and React.

> 📖 **Master Documentation**: For full architecture diagrams, database schemas, ER diagrams, REST API specs, and business logic details, see [`DOCUMENTATION.md`](DOCUMENTATION.md).

---

## 🚀 Key Modules & Business Workflows

### 1. Authentication & Role-Based Access Control (RBAC)
- **JWT-Based Authentication**: Secure token verification for every REST API request.
- **Granular Roles**:
  - **Admin**: Complete system access including customer deletion and inventory management.
  - **Sales**: Customer CRM management, creating & confirming sales challans.
  - **Warehouse**: Inventory stock management, stock IN/OUT manual log adjustments.
  - **Accounts**: View-only access to sales challan financials, reports, and customer profiles.

### 2. Customer CRM Module
- **Customer Directory**: Track Customer Name, Mobile, Email, Business Name, GST Number, Customer Type (*Retail*, *Wholesale*, *Distributor*), and Status (*Lead*, *Active*, *Inactive*).
- **Search & Filters**: Instant multi-attribute search across names, phone numbers, and businesses.
- **Follow-up Logging**: Maintain a timeline of follow-up dates and notes logged by sales representatives.

### 3. Product & Inventory Module
- **SKU & Stock Tracking**: Track product code, category, unit price, warehouse rack location, current stock level, and minimum alert thresholds.
- **Stock Alert Indicators**: Visual badges and filtering for items falling below minimum stock thresholds.
- **Stock Movement Log**: Automated and manual audit trails capturing every inventory increase (**IN**) or reduction (**OUT**), complete with timestamp, reason, and actor ID.

### 4. Sales Challan Module
- **Draft & Confirmed Workflow**:
  - **Draft Challans**: Save orders without reserving or altering warehouse stock.
  - **Confirmed Challans**: Deduct stock atomically and log **OUT** movement audit records.
- **Stock Validation & Fail-Safe**:
  - Stock is validated before confirmation. Attempting to confirm a challan when requested quantity exceeds available stock throws HTTP `400 Bad Request` with an explicit error message (`"Insufficient stock for product X. Available: Y, Requested: Z"`).
  - Stock levels cannot become negative under any circumstance.
- **Historical Snapshot Integrity**: Challan items preserve product snapshot data (Name, SKU, Unit Price at time of order creation) ensuring historical financial reports remain unaltered if product details change later.

---

## 🛠️ Tech Stack

### Backend
- **Node.js & TypeScript**: Type-safe REST server environment.
- **Express.js**: Clean REST API routing, CORS handling, and middleware integration.
- **SQLite (sqlite / sqlite3)**: Embedded database engine requiring zero external server configuration.
- **JSON Web Tokens (JWT) & BcryptJS**: Secure session tokens and password hashing.

### Frontend
- **React & TypeScript**: Interactive component-driven user interface.
- **Tailwind CSS & Lucide Icons**: Modern admin-style responsive layout.
- **Sonner**: Real-time toast notification system for feedback and validation errors.

---

## 📊 Database Schema Overview

```
+--------------------+        +-------------------+        +--------------------+
|      USERS         |        |     CUSTOMERS     |        |   CUSTOMER_NOTES   |
+--------------------+        +-------------------+        +--------------------+
| id (PK)            |        | id (PK)           |        | id (PK)            |
| name               |        | name              |        | customer_id (FK)   |
| email (UNIQUE)     |        | mobile            |        | text               |
| password           |        | email             |        | by_name            |
| role               |        | business_name     |        | created_at         |
| created_at         |        | gst               |        +--------------------+
+--------------------+        | type              |
                              | address           |
                              | status            |
                              | follow_up_date    |
                              | created_at        |
                              +-------------------+

+--------------------+        +-------------------+        +--------------------+
|      PRODUCTS      |        |     CHALLANS      |        |   CHALLAN_ITEMS    |
+--------------------+        +-------------------+        +--------------------+
| id (PK)            |        | id (PK)           |        | id (PK)            |
| name               |        | number (UNIQUE)   |        | challan_id (FK)    |
| sku (UNIQUE)       |        | customer_id       |        | product_id         |
| category           |        | customer_name     |        | product_name       |
| unit_price         |        | customer_business |        | sku                |
| current_stock      |        | total_qty         |        | unit_price         |
| min_stock_alert    |        | total_amount      |        | qty                |
| warehouse_location |        | status            |        | subtotal           |
| created_at         |        | created_by        |        +--------------------+
+--------------------+        | created_date      |
                              +-------------------+
+------------------------+
|    STOCK_MOVEMENTS     |
+------------------------+
| id (PK)                |
| product_id             |
| product_name           |
| product_sku            |
| qty_changed            |
| type (IN / OUT)        |
| reason                 |
| created_by             |
| timestamp              |
+------------------------+
```

---

## 🔌 REST API Reference

### Authentication
- `POST /api/auth/login` - Authenticate user & receive JWT token.
- `GET /api/auth/me` - Get current authenticated user details.

### Customers
- `GET /api/customers` - List customers (Supports pagination, search query, status/type filter).
- `GET /api/customers/:id` - Fetch single customer details & note history.
- `POST /api/customers` - Create customer. *(Roles: Admin, Sales)*
- `PUT /api/customers/:id` - Update customer details. *(Roles: Admin, Sales)*
- `POST /api/customers/:id/notes` - Add follow-up note.
- `DELETE /api/customers/:id` - Delete customer. *(Roles: Admin)*

### Products & Inventory
- `GET /api/products` - List products (Supports pagination, category filter, low-stock filter).
- `GET /api/products/:id` - Fetch product details.
- `POST /api/products` - Add product to inventory. *(Roles: Admin, Warehouse)*
- `PUT /api/products/:id` - Edit product information. *(Roles: Admin, Warehouse)*
- `POST /api/products/:id/adjust-stock` - Adjust stock (IN/OUT) with reason log. *(Roles: Admin, Warehouse)*

### Stock Movements
- `GET /api/stock-movements` - View inventory movement logs.

### Sales Challans
- `GET /api/challans` - List sales challans.
- `GET /api/challans/:id` - Get sales challan detail view.
- `POST /api/challans` - Create new sales challan as Draft or Confirmed. *(Roles: Admin, Sales)*
- `POST /api/challans/:id/confirm` - Confirm draft challan & deduct stock atomically. *(Roles: Admin, Sales)*
- `POST /api/challans/:id/cancel` - Cancel draft or confirmed challan (restocks if confirmed). *(Roles: Admin, Sales)*

### Dashboard
- `GET /api/dashboard/stats` - Summary KPI metrics and recent activity feeds.

---

## 🔑 Default Test Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@distroerp.com` | `admin123` |
| **Sales** | `sales@distroerp.com` | `sales123` |
| **Warehouse** | `warehouse@distroerp.com` | `warehouse123` |
| **Accounts** | `accounts@distroerp.com` | `accounts123` |

---

## ⚙️ Quick Start Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Start Backend & Frontend Concurrently**:
   ```bash
   npm run dev
   ```

3. **Access Application**:
   - **Frontend UI**: http://localhost:5173
   - **Backend REST API**: http://localhost:5000/api