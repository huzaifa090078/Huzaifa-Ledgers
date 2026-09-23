# Smart Technology — Salesman Mobile Ledger

A production-ready, **offline-first mobile ledger management application** built specifically for salesmen representing **Smart Technology**.

The application manages ledgers and accounts while keeping two distinct financial balances completely separated:
1. **Market / Party Receivables**: Money to be collected from customer shops.
2. **Company Payables**: Money payable / deposited to Smart Technology against referenced company invoices.

---

## ⚡ Key Highlights & Core Capabilities

- **100% Offline-First**: Uses browser **IndexedDB** (`Dexie.js`) for persistent local storage. Data survives app closing, browser restart, phone reboots, and network disconnects.
- **PWA Ready**: Can be installed to the home screen on Android, iOS, and desktop browsers.
- **Strict Accounting Rules**:
  - Invoices recorded for a party create a Debit on the party's ledger AND simultaneously create a liability against the salesman's company account.
  - Party payments reduce **only** that party's outstanding balance and **never** reduce the company liability.
  - Company payments reduce **only** the company payable balance and **never** reduce party balances.
  - Advance / overpayment detection without negative balances.
  - Net Outstanding Difference = `Market Receivable - Company Payable` (strictly financial difference, never called profit).
- **Professional PDF Export**:
  - One-tap download of mobile-readable, print-ready statements.
  - Standard Pakistani currency formatting (`Rs 10,000`, `Rs 1,000,000`).
- **WhatsApp Sharing**:
  - Native Web Share API integration to directly share PDF statements and summaries to WhatsApp or any messaging app.
- **Full JSON Backup & Restore**:
  - One-click full export of all local database records.
  - Safe import with schema validation and confirmation warnings.

---

## 📱 Navigation & Application Sections

1. **Dashboard**:
   - 4 Primary Summary Cards:
     - **Market Receivable** (total outstanding from all shops)
     - **Company Payable** (total outstanding to Smart Technology)
     - **Today's Recovery** (payments collected from parties today)
     - **Today's Company Payment** (deposits made to the company today)
   - Quick Salesman action shortcuts (`Add Party`, `Add Invoice`, `Receive Rs`, `Pay Company`).
   - Recent Transactions feed with visual direction tags (incoming vs outgoing vs liability).

2. **Parties Directory**:
   - Instant offline search by Party Name, Phone number, or Invoice Number.
   - Balance filter tabs (`All`, `Due`, `Nil`, `Adv`).
   - Party cards showing contact details, outstanding balance, and quick action buttons.
   - Delete protection: warns if a party has existing transaction history.

3. **Party Ledger (Detailed View)**:
   - Header summary banner with contact info and current outstanding balance.
   - Action buttons: `+ Invoice`, `+ Payment`, `PDF Export`, `WhatsApp Share`.
   - Chronological ledger list showing Date, Description, Debit (+), Credit (-), and Running Balance.
   - Inline edit and delete capabilities with automatic balance recalculation.

4. **Company Section (Smart Technology)**:
   - Total Company Liability, Total Paid, and Outstanding due to company.
   - `+ Pay Company` button to record bank deposits or cash handovers.
   - Traceable records: Referenced Invoices tab vs Company Deposits tab.

5. **Analytics**:
   - Period selector: `All Time`, `Today`, `This Week`, `This Month`, and `Custom Date Range`.
   - Market vs Company breakdown.
   - **Net Outstanding Difference** card.
   - Transaction counters (Parties, Invoices, Recoveries, Company Deposits).
   - Party-wise outstanding balances sorted by Highest, Lowest, or Alphabetical.

6. **Settings & Backup**:
   - Export backup to JSON.
   - Restore backup with schema validation.
   - Seed demo scenario data (`Ali Traders`, `Bilal Traders`, `Usman General Store`).
   - Secure local storage privacy guarantee.

---

## 🚀 Getting Started

### Development
```bash
npm run dev
```

### Run Automated Acceptance Test Suite
```bash
npm run test
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```
