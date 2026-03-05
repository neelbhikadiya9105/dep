# Inventory Avengers 🛡️ (StockPilot)

A full-stack inventory management system built with Node.js, Express, MongoDB, and **React + Vite + Tailwind CSS**.

## Features

- 🔐 **Authentication & Role-Based Access** — Owner, Manager, Staff roles with JWT
- 📦 **Inventory Management** — Full product CRUD, auto-SKU generation, barcode generation & download
- 🔲 **Barcode Scanning** — Scan barcodes in POS to instantly add products to cart
- 🧾 **Receipt Preview & PDF Download** — Full receipt preview after checkout + downloadable PDF
- 🏪 **Multi-Store Support** — Inventory per store; owner can manage all stores, staff/managers scoped to their store
- 🛒 **Point of Sale (POS)** — Real-time cart, product grid, barcode scanner, checkout
- 📊 **Reports & Analytics** — Revenue, profit, date-range filters, Chart.js graphs
- ↩️ **Returns & Refunds** — Process returns, auto-restock inventory
- ✅ **Approval Workflow** — Managers request deletions; owners approve/reject
- ⚡ **React + Vite SPA** — Hot reload in development, optimized production build with Tailwind CSS

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs  
**Frontend:** React 18, Vite, Tailwind CSS v3, Zustand, Axios, React Router v6, Chart.js, react-chartjs-2, JsBarcode, Html5QrcodeScanner, jsPDF, react-icons

## Installation

### Prerequisites
- Node.js 16+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd inve-proto

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
cp ../.env.example .env
# Edit .env and set MONGO_URI and JWT_SECRET

# 4. Install frontend dependencies (for development/build)
cd ../frontend
npm install
```

### Running in Development

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run dev        # starts Express on port 5000

# Terminal 2 — frontend (Vite dev server with HMR + API proxy)
cd frontend
npm run dev        # starts Vite on port 5173 (proxies /api → 5000)
```

Visit **http://localhost:5173** for development.

### Building for Production

```bash
cd frontend
npm run build      # outputs to frontend/dist/
```

Then start the backend:
```bash
cd backend
npm start          # serves frontend/dist/ at http://localhost:5000
```

### Initialize Demo Data

Visit the login page and click **"Initialize Demo Data"**, or:

```bash
curl http://localhost:5000/api/auth/seed
```

## Demo Credentials

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Owner   | owner@demo.com      | password123 |
| Manager | manager@demo.com    | password123 |
| Staff   | staff@demo.com      | password123 |

## Project Structure

```
inve-proto/
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   ├── Store.js
│   │   ├── Inventory.js
│   │   ├── Return.js
│   │   └── Approval.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── sales.js
│   │   ├── stores.js
│   │   ├── inventory.js
│   │   ├── returns.js
│   │   ├── reports.js
│   │   └── approvals.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── package.json           # React + Vite + Tailwind dependencies
│   ├── vite.config.js         # SPA config, /api proxy
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html             # Single entry point
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # Router setup
│       ├── index.css          # Tailwind + custom styles
│       ├── api/
│       │   └── axios.js       # Axios instance with interceptors
│       ├── store/
│       │   └── authStore.js   # Zustand auth store
│       ├── utils/
│       │   └── helpers.js     # Shared formatters
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Topbar.jsx
│       │   │   └── DashboardLayout.jsx
│       │   ├── ui/
│       │   │   ├── Alert.jsx
│       │   │   ├── Modal.jsx
│       │   │   ├── Badge.jsx
│       │   │   ├── Card.jsx
│       │   │   └── LoadingSpinner.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── RoleRoute.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Inventory.jsx
│           ├── Sales.jsx
│           ├── Returns.jsx
│           ├── Reports.jsx
│           └── Approvals.jsx
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | Login | Public |
| POST | /api/auth/register | Register user | Public |
| GET | /api/auth/seed | Create demo users + default store | Public |
| GET | /api/products | List all products | Any |
| GET | /api/products/lookup?barcode=X | Lookup product by barcode | Any |
| POST | /api/products | Create product (auto-SKU) | Owner/Manager |
| PUT | /api/products/:id | Update product | Owner/Manager |
| DELETE | /api/products/:id | Delete product | Owner (or approval) |
| POST | /api/sales | Create sale | Any |
| GET | /api/sales | List sales | Any |
| GET | /api/stores | List stores | Any |
| POST | /api/stores | Create store | Owner |
| PUT | /api/stores/:id | Update store | Owner |
| DELETE | /api/stores/:id | Delete store | Owner |
| GET | /api/inventory | Query stock levels | Any |
| POST | /api/inventory/adjust | Adjust stock | Owner/Manager |
| POST | /api/returns | Process return | Any |
| GET | /api/returns | List returns | Any |
| GET | /api/reports/sales | Sales report | Owner/Manager |
| GET | /api/approvals | List approvals | Any |
| PUT | /api/approvals/:id | Approve/Reject | Owner |

## Role Permissions

| Action | Owner | Manager | Staff |
|--------|-------|---------|-------|
| View products | ✅ | ✅ | ✅ |
| Add/Edit products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ⚠️ (approval) | ❌ |
| Process sales | ✅ | ✅ | ✅ |
| Scan barcodes | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| Approve requests | ✅ | ❌ | ❌ |
| Manage stores | ✅ | ❌ | ❌ |
| Adjust inventory | ✅ | ✅ | ❌ |
| Switch stores | ✅ | ❌ | ❌ |


## Features

- 🔐 **Authentication & Role-Based Access** — Owner, Manager, Staff roles with JWT
- 📦 **Inventory Management** — Full product CRUD, auto-SKU generation, barcode generation & download
- 🔲 **Barcode Scanning** — Scan barcodes in POS to instantly add products to cart
- 🧾 **Receipt Preview & PDF Download** — Full receipt preview after checkout + downloadable PDF
- 🏪 **Multi-Store Support** — Inventory per store; owner can manage all stores, staff/managers scoped to their store
- 🛒 **Point of Sale (POS)** — Real-time cart, product grid, barcode scanner, checkout
- 📊 **Reports & Analytics** — Revenue, profit, date-range filters, Chart.js graphs
- ↩️ **Returns & Refunds** — Process returns, auto-restock inventory
- ✅ **Approval Workflow** — Managers request deletions; owners approve/reject
- ⚡ **Vite Frontend** — Hot reload in development, optimized production build

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs  
**Frontend:** Vite (MPA), ES Modules, Chart.js, JsBarcode, Html5QrcodeScanner, jsPDF, Font Awesome

## Installation

### Prerequisites
- Node.js 16+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd inve-proto

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
cp ../.env.example .env
# Edit .env and set MONGO_URI and JWT_SECRET

# 4. Install frontend dependencies (for development/build)
cd ../frontend
npm install
```

### Running in Development

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run dev        # starts Express on port 5000

# Terminal 2 — frontend (Vite dev server with HMR + API proxy)
cd frontend
npm run dev        # starts Vite on port 5173 (proxies /api → 5000)
```

Visit **http://localhost:5173** for development.

### Building for Production

```bash
cd frontend
npm run build      # outputs to frontend/dist/
```

Then start the backend:
```bash
cd backend
npm start          # serves frontend/dist/ at http://localhost:5000
```

### Initialize Demo Data

Visit the login page and click **"Initialize Demo Data"**, or:

```bash
curl http://localhost:5000/api/auth/seed
```

## Demo Credentials

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Owner   | owner@demo.com      | password123 |
| Manager | manager@demo.com    | password123 |
| Staff   | staff@demo.com      | password123 |

## Project Structure

```
inve-proto/
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js          # protect, authorize, authorizeStore
│   ├── models/
│   │   ├── User.js                 # + storeId field
│   │   ├── Product.js              # + sku, barcode, barcodeType fields
│   │   ├── Sale.js                 # + storeId, receiptNumber, tax, subtotal
│   │   ├── Store.js                # NEW — multi-store
│   │   ├── Inventory.js            # NEW — per-store stock levels
│   │   ├── Return.js
│   │   └── Approval.js
│   ├── routes/
│   │   ├── auth.js                 # includes storeId in JWT, seed creates default store
│   │   ├── products.js             # + barcode lookup endpoint + SKU auto-gen
│   │   ├── sales.js                # + storeId + receiptNumber
│   │   ├── stores.js               # NEW — CRUD for stores
│   │   ├── inventory.js            # NEW — per-store stock adjust & query
│   │   ├── returns.js
│   │   ├── reports.js
│   │   └── approvals.js
│   ├── server.js                   # serves frontend/dist/ (or frontend/ in dev)
│   └── package.json
├── frontend/
│   ├── package.json                # Vite + chart.js + jsbarcode + html5-qrcode + jspdf
│   ├── vite.config.js              # MPA config, /api proxy
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js                  # ES module (export default API)
│   │   ├── login.js                # NEW — extracted login logic
│   │   ├── dashboard.js            # ES module, Chart.js from npm
│   │   ├── inventory.js            # + barcode generation
│   │   ├── sales.js                # + barcode scanner + receipt PDF
│   │   ├── reports.js
│   │   ├── returns.js
│   │   └── approvals.js
│   ├── index.html
│   ├── dashboard.html              # + store selector
│   ├── inventory.html              # + SKU/barcode fields in modal
│   ├── sales.html                  # + scan button, scanner modal, receipt modal
│   ├── reports.html
│   ├── returns.html
│   └── approvals.html
├── .env.example
├── .gitignore
└── README.md
```

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | Login | Public |
| POST | /api/auth/register | Register user | Public |
| GET | /api/auth/seed | Create demo users + default store | Public |
| GET | /api/products | List all products | Any |
| GET | /api/products/lookup?barcode=X | Lookup product by barcode | Any |
| POST | /api/products | Create product (auto-SKU) | Owner/Manager |
| PUT | /api/products/:id | Update product | Owner/Manager |
| DELETE | /api/products/:id | Delete product | Owner (or approval) |
| POST | /api/sales | Create sale | Any |
| GET | /api/sales | List sales | Any |
| GET | /api/stores | List stores | Any |
| POST | /api/stores | Create store | Owner |
| PUT | /api/stores/:id | Update store | Owner |
| DELETE | /api/stores/:id | Delete store | Owner |
| GET | /api/inventory | Query stock levels | Any |
| POST | /api/inventory/adjust | Adjust stock | Owner/Manager |
| POST | /api/returns | Process return | Any |
| GET | /api/returns | List returns | Any |
| GET | /api/reports/sales | Sales report | Owner/Manager |
| GET | /api/approvals | List approvals | Any |
| PUT | /api/approvals/:id | Approve/Reject | Owner |

## Role Permissions

| Action | Owner | Manager | Staff |
|--------|-------|---------|-------|
| View products | ✅ | ✅ | ✅ |
| Add/Edit products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ⚠️ (approval) | ❌ |
| Process sales | ✅ | ✅ | ✅ |
| Scan barcodes | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| Approve requests | ✅ | ❌ | ❌ |
| Manage stores | ✅ | ❌ | ❌ |
| Adjust inventory | ✅ | ✅ | ❌ |
| Switch stores | ✅ | ❌ | ❌ |
