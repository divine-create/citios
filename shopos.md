# ShopOS: Point of Sale & Retail Management System

ShopOS is the comprehensive retail and point-of-sale (POS) operating system within the CityConnect platform. It is designed to handle everything from live checkout and inventory management to customer loyalty and e-commerce syncing.

## 1. Core Architecture
- **Data Layer:** PostgreSQL (via Prisma ORM) ensuring all transactions, stock levels, and customer data are stored persistently and reliably.
- **Role-Based Access Control:** Features are dynamically locked down based on user roles:
  - **OWNER / MANAGER:** Full access to all financial reporting, expenses, and system settings.
  - **CASHIER:** Restricted to the POS Terminal, Sales/Returns, Customers, and Shifts.
  - **INVENTORY_STAFF:** Restricted to Products & Inventory, and Suppliers/POs.

## 2. Modules & Functionality

### 📊 Dashboard
- **Real-time Metrics:** Tracks gross sales, net sales, refund totals, and transaction volumes for the current day.
- **Alerts:** Highlights low-stock items requiring immediate reordering.
- **Shift Status:** Indicates whether the current user has an open cash drawer shift.

### 🛒 POS Terminal (Point of Sale)
- **Live Checkout Interface:** Fast, responsive cart system designed for rapid scanning and tap-to-add.
- **Weighed Items:** Native support for items sold by weight (e.g., Produce) with dynamic price calculation.
- **Loyalty Integration:** Look up customers at checkout to apply earned loyalty points for discounts.
- **Receipt Generation:** Automatically generates detailed receipts for printing or emailing.

### 📦 Products & Inventory
- **Product Management:** Full CRUD operations for retail items, including SKU, barcode, price, cost, and stock quantities.
- **Category Management:** Group products into distinct, manageable categories. Ensures categories cannot be deleted if products are actively using them.
- **Custom Units:** Flexible datalist combo-boxes allowing standard units (kg, lb) or custom typed units (box, crate, pallet).
- **Stock Tracking:** Automatic deduction of stock quantities during POS checkout and automatic replenishment when Purchase Orders are received.

### 🔄 Sales & Returns
- **Order History:** A complete, searchable ledger of all past transactions.
- **Refund Processing:** Securely process full or partial returns, automatically adjusting sales metrics and (optionally) returning items to inventory stock.

### 👥 Customers (CRM & Loyalty)
- **Customer Database:** Track customer names, contact info, and lifetime spend.
- **Order Tracking:** Click on any customer to see their specific purchase history.
- **Loyalty Program:** Customers automatically accumulate points based on their purchases, which can be redeemed at the POS terminal.

### 🚚 Suppliers & Purchase Orders
- **Vendor Management:** Keep track of supplier contact info and terms.
- **Purchase Orders (POs):** Draft POs for low-stock items.
- **Inventory Sync:** When a PO is marked as "Received", the system automatically increments the `stockQuantity` of the associated products.

### 💵 Cash & Shifts
- **Drawer Management:** Open a shift with a starting float (cash in drawer).
- **Reconciliation:** Close a shift by declaring the actual cash counted. The system automatically calculates expected cash based on POS transactions and highlights any discrepancies (overages/shortages).

### 📉 Expenses
- **Operational Ledger:** Record day-to-day business expenses (e.g., Utilities, Payroll, Maintenance, Supplies).
- **Categorization:** Visual breakdown of monthly spend by category to help owners track profitability alongside gross sales.

### 🌐 Online Store (Website Builder)
- **Live Syncing E-commerce:** With one click, owners can provision a public-facing website.
- **Instant Inventory:** The online store directly reads from the live PostgreSQL database, meaning products added to the POS instantly appear online, and out-of-stock items are automatically hidden.
- **Starter Templates:** Choose from tailored themes like **"Local Grocery"** (for massive product catalogs) or **"Modern Apparel"** (sleek, image-focused layout).
