export interface Party {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyInvoice {
  id: string;
  invoiceNumber: string;
  partyId: string;
  partyName: string;
  companyId?: string;
  companyName?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartyPaymentMethod = 'Cash' | 'Bank' | 'Easypaisa' | 'JazzCash' | 'Other';

export interface PartyPayment {
  id: string;
  partyId: string;
  partyName: string;
  /** @deprecated Kept for historical backup compatibility; Party Payment has ONLY a Party relationship */
  companyId?: string;
  companyName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PartyPaymentMethod;
  reference?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type CompanyPaymentMethod = 'Cash' | 'Bank' | 'Easypaisa' | 'JazzCash' | 'Other';

export interface Company {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInvoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string;
  partyId?: string;
  partyName?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyPayment {
  id: string;
  companyId?: string;
  companyName?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: CompanyPaymentMethod;
  reference?: string; // Receipt / Deposit Slip number
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  salesmanName: string;
  companyName: string;
  currencySymbol: string;
  updatedAt: string;
}

export interface PartyLedgerEntry {
  id: string;
  date: string;
  type: 'invoice' | 'payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  companyId?: string;
  companyName?: string;
  paymentMethod?: PartyPaymentMethod;
  invoiceNumber?: string;
  rawItem: PartyInvoice | PartyPayment;
}

export interface PartyBalanceSummary {
  partyId: string;
  partyName: string;
  phone?: string;
  totalInvoices: number;
  totalPayments: number;
  currentBalance: number;
  isAdvance: boolean;
  advanceAmount: number;
  lastActivityDate?: string;
}

export interface CompanyBalanceSummary {
  totalLiability: number;
  totalPaid: number;
  outstanding: number;
  isAdvance: boolean;
  advanceAmount: number;
}

export interface IndividualCompanyBalanceSummary {
  companyId: string;
  companyName: string;
  phone?: string;
  address?: string;
  totalInvoices: number;
  totalPayments: number;
  currentBalance: number;
  isAdvance: boolean;
  advanceAmount: number;
  lastActivityDate?: string;
}

export interface CompanyLedgerEntry {
  id: string;
  date: string;
  type: 'invoice' | 'payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  partyId?: string;
  partyName?: string;
  companyId?: string;
  companyName?: string;
  paymentMethod?: CompanyPaymentMethod | PartyPaymentMethod;
  invoiceNumber?: string;
  rawItem: PartyInvoice | PartyPayment | CompanyInvoice | CompanyPayment;
}

export interface CompanyPeriodLedger {
  startDate?: string;
  endDate?: string;
  isDateRange: boolean;
  openingBalance: number;
  isOpeningAdvance: boolean;
  periodInvoicesTotal: number;
  periodPaymentsTotal: number;
  closingBalance: number;
  isClosingAdvance: boolean;
  entries: CompanyLedgerEntry[];
}

export interface AnalyticsSummary {
  marketReceivable: number;
  marketInvoiced: number;
  marketRecovered: number;
  companyLiability: number;
  companyPaid: number;
  companyOutstanding: number;
  netOutstandingDifference: number; // Market Receivable - Company Payable
  todayRecovery: number;
  todayCompanyPayment: number;
  activePartiesCount: number;
  invoicesCount: number;
  partyPaymentsCount: number;
  companyPaymentsCount: number;
  companiesCount?: number;
  companyInvoicesCount?: number;
}

export type TransactionType = 'invoice' | 'party_payment' | 'company_payment' | 'company_invoice';

export interface RecentTransactionItem {
  id: string;
  date: string;
  timestamp: string;
  title: string;
  subtitle: string;
  amount: number;
  type: TransactionType;
  direction: 'incoming' | 'outgoing' | 'liability';
}

export type DateFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export interface DailyReconciliation {
  id: string; // recon-YYYY-MM-DD
  date: string; // YYYY-MM-DD
  openingCash: number;
  cashExpenses: number;
  actualCash: number;
  openingBank: number;
  bankWithdrawals: number;
  actualBank: number;
  openingEasypaisa: number;
  easypaisaWithdrawals: number;
  actualEasypaisa: number;
  openingJazzCash: number;
  jazzCashWithdrawals: number;
  actualJazzCash: number;
  notes?: string;
  updatedAt: string;
}

export interface DailyCollectionSummary {
  date: string;
  cashCollection: number;
  bankCollection: number;
  easypaisaCollection: number;
  jazzCashCollection: number;
  otherCollection: number;
  totalCollection: number;
  payments: PartyPayment[];
}

export interface MethodReconciliationResult {
  method: string;
  opening: number;
  collection: number;
  outflow: number;
  expected: number;
  actual: number;
  difference: number;
  isMatched: boolean;
}

export interface DailyReconciliationSummary {
  date: string;
  cash: MethodReconciliationResult;
  bank: MethodReconciliationResult;
  easypaisa: MethodReconciliationResult;
  jazzCash: MethodReconciliationResult;
  totalDifference: number;
  isAllMatched: boolean;
  todayCompanyPayment: number;
}
