# 📦 Purchase Order Management System (NestJS + MongoDB)

A professional **Purchase Order & GRN Management System** built using **NestJS** and **MongoDB** that supports full PO lifecycle including creation, revision control, GRN tracking, and accurate pending quantity calculations.

---

## 🚀 Project Overview

This system handles end-to-end purchase order processing with advanced revision logic, ensuring:

* ✅ Unique PO ID for every revision
* ✅ Same PO Number across revisions
* ✅ Automatic revision tracking (`po_rev`)
* ✅ Only one active revision at a time
* ✅ Accurate GRN-based received quantity
* ✅ Intelligent adjustment logic (no duplicate subtraction)

It is ideal for ERP, inventory, and procurement systems.

---

## 🧩 Key Features

### ✅ Purchase Order Management

* Create Purchase Orders
* Track supplier, amount, transportation & notes
* Auto-generate revision number

### 🔁 PO Revision System

* Revise by **PO Number (not ID)**
* Creates new unique MongoDB ObjectId while retaining PO No
* Deactivates previous revision
* Maintains revision history

### 📥 Goods Receipt Note (GRN)

* Link GRN with Purchase Orders
* Record received quantities
* Supports multiple GRNs per PO

### 📊 PO Status Tracking

* Real-time pending quantity
* Calculates received + adjusted quantities
* Shows status:

  * `Pending`
  * `Completed`

---

## 🛠️ Tech Stack

* **Backend Framework:** NestJS
* **Database:** MongoDB (Mongoose ODM)
* **Language:** TypeScript
* **Validation:** class-validator & class-transformer
* **API Testing:** Postman

---

## 📂 Project Structure

```
src/
├── purchase/
│   ├── dto/
│   ├── schemas/
│   ├── purchase.controller.ts
│   ├── purchase.service.ts
│   └── purchase.module.ts
├── grn/
│   ├── dto/
│   ├── schemas/
│   ├── grn.controller.ts
│   ├── grn.service.ts
│   └── grn.module.ts
└── main.ts
```

---

## 🔌 API Endpoints

### ➤ Create Purchase Order

```
POST /api/purchase
```

### ➤ Revise Purchase Order (by PO No)

```
POST /api/purchase/:po_no/revision
```

### ➤ Create GRN

```
POST /api/grn
```

### ➤ Get PO Status

```
GET /api/purchase/:po_no/status
```

---


## 👨‍💻 How to Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev
```


