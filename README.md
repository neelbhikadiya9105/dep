# Inventory Avengers 🛡️

A full-stack inventory management system built with Node.js, Express, MongoDB, and vanilla JavaScript.

## Features

- 🔐 **Authentication & Role-Based Access** — Owner, Manager, Staff roles with JWT
- 📦 **Inventory Management** — Full product CRUD with low-stock alerts
- 🛒 **Point of Sale (POS)** — Real-time cart, product grid, checkout
- 📊 **Reports & Analytics** — Revenue, profit, date-range filters, Chart.js graphs
- ↩️ **Returns & Refunds** — Process returns, auto-restock inventory
- ✅ **Approval Workflow** — Managers request deletions; owners approve/reject
- 🎨 **Professional UI** — Sidebar layout, modals, badges, responsive design

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs  
**Frontend:** Vanilla HTML/CSS/JS, Chart.js, Font Awesome, Google Fonts (Inter)

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

# 4. Start the server
npm run dev        # development (nodemon)
npm start          # production
```

The app will be available at **http://localhost:5000**

### Initialize Demo Data

Visit `http://localhost:5000` and click **"Initialize Demo Data"** to create demo accounts, or call:

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
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js    # JWT protect & authorize
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   ├── Return.js
│   │   └── Approval.js
│   ├── routes/               # Express route handlers
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── sales.js
│   │   ├── returns.js
│   │   ├── reports.js
│   │   └── approvals.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── css/style.css         # Global stylesheet
│   ├── js/
│   │   ├── api.js            # Global API client
│   │   ├── dashboard.js
│   │   ├── inventory.js
│   │   ├── sales.js
│   │   ├── reports.js
│   │   ├── returns.js
│   │   └── approvals.js
│   ├── index.html            # Login page
│   ├── dashboard.html
│   ├── inventory.html
│   ├── sales.html            # POS
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
| GET | /api/auth/seed | Create demo users | Public |
| GET | /api/products | List all products | Any |
| POST | /api/products | Create product | Owner/Manager |
| PUT | /api/products/:id | Update product | Owner/Manager |
| DELETE | /api/products/:id | Delete product | Owner (or approval) |
| POST | /api/sales | Create sale | Any |
| GET | /api/sales | List sales | Any |
| POST | /api/returns | Process return | Any |
| GET | /api/returns | List returns | Any |
| GET | /api/reports/sales | Sales report | Owner/Manager |
| GET | /api/approvals | List approvals | Any |
| POST | /api/approvals | Create request | Any |
| PUT | /api/approvals/:id | Approve/Reject | Owner |

## Role Permissions

| Action | Owner | Manager | Staff |
|--------|-------|---------|-------|
| View products | ✅ | ✅ | ✅ |
| Add/Edit products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ⚠️ (approval) | ❌ |
| Process sales | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| Approve requests | ✅ | ❌ | ❌ |