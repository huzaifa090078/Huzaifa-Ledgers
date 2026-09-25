import type {
  Party,
  PartyInvoice,
  PartyPayment,
  CompanyPayment,
  Company,
  CompanyInvoice,
  PartyLedgerEntry,
  CompanyLedgerEntry,
  CompanyBalanceSummary,
  IndividualCompanyBalanceSummary,
  CompanyPeriodLedger,
  AnalyticsSummary,
  RecentTransactionItem,
  DateFilterType,
  DailyCollectionSummary,
  DailyReconciliation,
  DailyReconciliationSummary,
  MethodReconciliationResult,
} from '../types';

/**
 * Format currency in standard Pakistani Rupee representation:
 * e.g. Rs 10,000 or Rs 1,000,000 (never 10000.00)
 */
export function formatPKR(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formattedNumber = Math.abs(rounded).toLocaleString('en-PK');
  const prefix = rounded < 0 ? '-Rs ' : 'Rs ';
  return `${prefix}${formattedNumber}`;
}

/**
 * Format numeric value without 'Rs ' prefix for table columns
 */
export function formatAmountOnly(amount: number): string {
  const rounded = Math.round(amount || 0);
  return Math.abs(rounded).toLocaleString('en-PK');
}

/**
 * Global Central Date Formatter:
 * Converts YYYY-MM-DD, ISO string, Date object, or timestamp to standard DD-MM-YYYY display format.
 * Always ensures 2-digit day, 2-digit month, and 4-digit year with hyphens: e.g. '24-09-2026', '05-01-2027'.
 */
export function formatDateDisplay(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = String(dateInput.getFullYear());
    return `${day}-${month}-${year}`;
  }

  const dateStr = String(dateInput).trim();
  if (!dateStr) return '';

  // Extract clean date portion if ISO string (e.g. 2026-09-24T12:00:00Z -> 2026-09-24)
  const clean = dateStr.split('T')[0].split(' ')[0];

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    return clean;
  }

  // If YYYY-MM-DD or YYYY-M-D
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // If DD-MM-YYYY with single digits e.g. D-M-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // If DD/MM/YYYY or YYYY/MM/DD with slashes
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Fallback for standard date parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}-${month}-${year}`;
  }

  return dateStr;
}

/**
 * Reusable global formatDate alias
 */
export const formatDate = formatDateDisplay;

/**
 * Format ISO-8601 UTC timestamp to Pakistan Local Date & Time (Asia/Karachi, UTC+05:00)
 * Example: '2026-09-24T11:10:00.000Z' -> '24-09-2026 04:10 PM'
 * Reliably handles midnight/date rollover without manual math hacks.
 */
export function formatLocalTimestamp(isoStr?: string): string {
  if (!isoStr) return '';
  const dateObj = new Date(isoStr);
  if (isNaN(dateObj.getTime())) return '';

  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj).replace(/\//g, '-');

  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);

  return `${datePart} ${timePart}`;
}

/**
 * Format ISO-8601 UTC timestamp to Pakistan Local Time only (Asia/Karachi, UTC+05:00)
 * Example: '2026-09-24T11:10:00.000Z' -> '04:10 PM'
 */
export function formatLocalTime(isoStr?: string): string {
  if (!isoStr) return '';
  const dateObj = new Date(isoStr);
  if (isNaN(dateObj.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Get current date in Pakistan local time in YYYY-MM-DD machine format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Rule 1 & Rule 8:
 * Calculate single party's financial balance strictly from its invoices and payments.
 * Party outstanding = Total Party Invoices - Total Party Payments.
 * If payments > invoices, it is classified as an advance/credit.
 */
export function calculatePartyBalance(
  partyId: string,
  allInvoices: PartyInvoice[],
  allPayments: PartyPayment[]
): {
  totalInvoices: number;
  totalPayments: number;
  currentBalance: number;
  isAdvance: boolean;
  advanceAmount: number;
} {
  const partyInvoices = allInvoices.filter((inv) => inv.partyId === partyId);
  const partyPayments = allPayments.filter((pmt) => pmt.partyId === partyId);

  const totalInvoices = partyInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPayments = partyPayments.reduce((sum, pmt) => sum + (Number(pmt.amount) || 0), 0);

  const rawDifference = totalInvoices - totalPayments;
  const isAdvance = rawDifference < 0;
  const currentBalance = isAdvance ? 0 : rawDifference;
  const advanceAmount = isAdvance ? Math.abs(rawDifference) : 0;

  return {
    totalInvoices,
    totalPayments,
    currentBalance,
    isAdvance,
    advanceAmount,
  };
}

/**
 * Build chronological ledger timeline for a party with running balances.
 * Invoices add to balance (Debit).
 * Payments subtract from balance (Credit).
 */
export function getPartyLedgerTimeline(
  partyId: string,
  allInvoices: PartyInvoice[],
  allPayments: PartyPayment[]
): { entries: PartyLedgerEntry[]; finalBalance: number; totalDebit: number; totalCredit: number } {
  const partyInvoices = allInvoices.filter((inv) => inv.partyId === partyId);
  const partyPayments = allPayments.filter((pmt) => pmt.partyId === partyId);

  type RawItem =
    | { kind: 'inv'; data: PartyInvoice; date: string; time: string }
    | { kind: 'pmt'; data: PartyPayment; date: string; time: string };

  const rawList: RawItem[] = [
    ...partyInvoices.map((inv) => ({
      kind: 'inv' as const,
      data: inv,
      date: inv.date,
      time: inv.createdAt || inv.date,
    })),
    ...partyPayments.map((pmt) => ({
      kind: 'pmt' as const,
      data: pmt,
      date: pmt.date,
      time: pmt.createdAt || pmt.date,
    })),
  ];

  // Sort ascending by date, then by creation time
  rawList.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries: PartyLedgerEntry[] = rawList.map((item) => {
    if (item.kind === 'inv') {
      const inv = item.data;
      const debit = Number(inv.amount) || 0;
      totalDebit += debit;
      runningBalance += debit;
      return {
        id: inv.id,
        date: inv.date,
        type: 'invoice',
        description: `Invoice #${inv.invoiceNumber}${inv.description ? ` - ${inv.description}` : ''}`,
        debit,
        credit: 0,
        balance: runningBalance,
        invoiceNumber: inv.invoiceNumber,
        rawItem: inv,
      };
    } else {
      const pmt = item.data;
      const credit = Number(pmt.amount) || 0;
      totalCredit += credit;
      runningBalance -= credit;
      return {
        id: pmt.id,
        date: pmt.date,
        type: 'payment',
        description: `Payment - ${pmt.paymentMethod}${pmt.reference ? ` (Ref: ${pmt.reference})` : ''}${pmt.note ? ` - ${pmt.note}` : ''}`,
        debit: 0,
        credit,
        balance: runningBalance,
        paymentMethod: pmt.paymentMethod,
        rawItem: pmt,
      };
    }
  });

  return {
    entries,
    finalBalance: runningBalance,
    totalDebit,
    totalCredit,
  };
}

export interface PartyPeriodLedger {
  startDate?: string;
  endDate?: string;
  isDateRange: boolean;
  openingBalance: number;
  isOpeningAdvance: boolean;
  periodInvoicesTotal: number;
  periodPaymentsTotal: number;
  closingBalance: number;
  isClosingAdvance: boolean;
  entries: PartyLedgerEntry[];
}

/**
 * Calculates party ledger transactions and balances for a specific date range.
 * - Opening balance is calculated from all transactions strictly prior to startDate.
 * - Only transactions between startDate and endDate (inclusive) are returned in entries.
 * - Closing balance = Opening Balance + Period Invoices - Period Payments.
 * - If no startDate is specified, it returns the full ledger.
 */
export function calculatePartyPeriodLedger(
  partyId: string,
  allInvoices: PartyInvoice[],
  allPayments: PartyPayment[],
  startDate?: string,
  endDate?: string
): PartyPeriodLedger {
  const fullTimeline = getPartyLedgerTimeline(partyId, allInvoices, allPayments);
  const isDateRange = Boolean(startDate || endDate);

  // Transactions before startDate
  const priorEntries = startDate
    ? fullTimeline.entries.filter((e) => e.date < startDate)
    : [];

  const priorDebits = priorEntries.reduce((sum, e) => sum + e.debit, 0);
  const priorCredits = priorEntries.reduce((sum, e) => sum + e.credit, 0);
  const openingBalance = priorDebits - priorCredits;
  const isOpeningAdvance = openingBalance < 0;

  // Transactions in the period [startDate, endDate]
  const periodEntries = fullTimeline.entries.filter((entry) => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  const periodInvoicesTotal = periodEntries.reduce((sum, e) => sum + e.debit, 0);
  const periodPaymentsTotal = periodEntries.reduce((sum, e) => sum + e.credit, 0);

  // Closing balance = Opening Balance + Period Invoices - Period Payments
  const closingBalance = openingBalance + periodInvoicesTotal - periodPaymentsTotal;
  const isClosingAdvance = closingBalance < 0;

  return {
    startDate,
    endDate,
    isDateRange,
    openingBalance,
    isOpeningAdvance,
    periodInvoicesTotal,
    periodPaymentsTotal,
    closingBalance,
    isClosingAdvance,
    entries: periodEntries,
  };
}

/**
 * Rule 2, 3, 4:
 * Company balance calculation.
 * Total Company Liability = sum of ALL party invoices (referenced orders).
 * Total Paid to Company = sum of ALL company payments.
 * Outstanding to Company = Total Liability - Total Paid.
 * Party payments do NOT affect this calculation!
 */
export function calculateCompanyBalance(
  allInvoices: PartyInvoice[],
  allCompanyPayments: CompanyPayment[]
): CompanyBalanceSummary {
  const totalLiability = allInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPaid = allCompanyPayments.reduce((sum, pmt) => sum + (Number(pmt.amount) || 0), 0);

  const rawDifference = totalLiability - totalPaid;
  const isAdvance = rawDifference < 0;
  const outstanding = isAdvance ? 0 : rawDifference;
  const advanceAmount = isAdvance ? Math.abs(rawDifference) : 0;

  return {
    totalLiability,
    totalPaid,
    outstanding,
    isAdvance,
    advanceAmount,
  };
}

/**
 * Calculate balance summary for an individual company in the Universal Company Ledger system.
 * Purchases/Invoices received increase amount payable (we owe the company).
 * Payments made decrease amount payable.
 * Outstanding = totalInvoices - totalPayments.
 * If totalPayments > totalInvoices, it is an advance payment (isAdvance = true).
 */
export function calculateSingleCompanyBalance(
  companyId: string,
  allInvoices: CompanyInvoice[],
  allPayments: CompanyPayment[]
): IndividualCompanyBalanceSummary {
  const companyInvoices = allInvoices.filter((inv) => inv.companyId === companyId);
  const companyPayments = allPayments.filter((pmt) => pmt.companyId === companyId);

  const totalInvoices = companyInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPayments = companyPayments.reduce((sum, pmt) => sum + (Number(pmt.amount) || 0), 0);

  const rawDifference = totalInvoices - totalPayments;
  const isAdvance = rawDifference < 0;
  const currentBalance = isAdvance ? 0 : rawDifference;
  const advanceAmount = isAdvance ? Math.abs(rawDifference) : 0;

  // Find most recent activity date
  const allDates = [
    ...companyInvoices.map((i) => i.date),
    ...companyPayments.map((p) => p.date),
  ].sort((a, b) => b.localeCompare(a));
  const lastActivityDate = allDates.length > 0 ? allDates[0] : undefined;

  return {
    companyId,
    companyName: companyInvoices[0]?.companyName || companyPayments[0]?.companyName || '',
    totalInvoices,
    totalPayments,
    currentBalance,
    isAdvance,
    advanceAmount,
    lastActivityDate,
  };
}

/**
 * Build chronological ledger timeline for a company with running balances.
 * Purchases/Invoices add to payable balance (Debit).
 * Payments subtract from payable balance (Credit).
 */
export function getCompanyLedgerTimeline(
  companyId: string,
  allInvoices: CompanyInvoice[],
  allPayments: CompanyPayment[]
): { entries: CompanyLedgerEntry[]; finalBalance: number; totalDebit: number; totalCredit: number } {
  const companyInvoices = allInvoices.filter((inv) => inv.companyId === companyId);
  const companyPayments = allPayments.filter((pmt) => pmt.companyId === companyId);

  type RawCompanyItem =
    | { kind: 'inv'; data: CompanyInvoice; date: string; time: string }
    | { kind: 'pmt'; data: CompanyPayment; date: string; time: string };

  const rawList: RawCompanyItem[] = [
    ...companyInvoices.map((inv) => ({
      kind: 'inv' as const,
      data: inv,
      date: inv.date,
      time: inv.createdAt || inv.date,
    })),
    ...companyPayments.map((pmt) => ({
      kind: 'pmt' as const,
      data: pmt,
      date: pmt.date,
      time: pmt.createdAt || pmt.date,
    })),
  ];

  // Sort ascending by date, then by creation time
  rawList.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries: CompanyLedgerEntry[] = rawList.map((item) => {
    if (item.kind === 'inv') {
      const inv = item.data;
      const debit = Number(inv.amount) || 0;
      totalDebit += debit;
      runningBalance += debit;
      return {
        id: inv.id,
        date: inv.date,
        type: 'invoice',
        description: `Purchase / Bill #${inv.invoiceNumber}${inv.description ? ` - ${inv.description}` : ''}`,
        debit,
        credit: 0,
        balance: runningBalance,
        invoiceNumber: inv.invoiceNumber,
        rawItem: inv,
      };
    } else {
      const pmt = item.data;
      const credit = Number(pmt.amount) || 0;
      totalCredit += credit;
      runningBalance -= credit;
      return {
        id: pmt.id,
        date: pmt.date,
        type: 'payment',
        description: `Payment - ${pmt.paymentMethod}${pmt.reference ? ` (Ref: ${pmt.reference})` : ''}${pmt.note ? ` - ${pmt.note}` : ''}`,
        debit: 0,
        credit,
        balance: runningBalance,
        paymentMethod: pmt.paymentMethod,
        rawItem: pmt,
      };
    }
  });

  return {
    entries,
    finalBalance: runningBalance,
    totalDebit,
    totalCredit,
  };
}

/**
 * Calculates company ledger transactions and balances for a specific date range.
 * - Opening balance is calculated from all transactions strictly prior to startDate.
 * - Only transactions between startDate and endDate (inclusive) are returned in entries.
 * - Closing balance = Opening Balance + Period Purchases - Period Payments.
 * - If no startDate is specified, it returns the full ledger.
 */
export function calculateCompanyPeriodLedger(
  companyId: string,
  allInvoices: CompanyInvoice[],
  allPayments: CompanyPayment[],
  startDate?: string,
  endDate?: string
): CompanyPeriodLedger {
  const fullTimeline = getCompanyLedgerTimeline(companyId, allInvoices, allPayments);
  const isDateRange = Boolean(startDate || endDate);

  // Transactions before startDate
  const priorEntries = startDate
    ? fullTimeline.entries.filter((e) => e.date < startDate)
    : [];

  const priorDebits = priorEntries.reduce((sum, e) => sum + e.debit, 0);
  const priorCredits = priorEntries.reduce((sum, e) => sum + e.credit, 0);
  const openingBalance = priorDebits - priorCredits;
  const isOpeningAdvance = openingBalance < 0;

  // Transactions in the period [startDate, endDate]
  const periodEntries = fullTimeline.entries.filter((entry) => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  const periodInvoicesTotal = periodEntries.reduce((sum, e) => sum + e.debit, 0);
  const periodPaymentsTotal = periodEntries.reduce((sum, e) => sum + e.credit, 0);

  // Closing balance = Opening Balance + Period Purchases - Period Payments
  const closingBalance = openingBalance + periodInvoicesTotal - periodPaymentsTotal;
  const isClosingAdvance = closingBalance < 0;

  return {
    startDate,
    endDate,
    isDateRange,
    openingBalance,
    isOpeningAdvance,
    periodInvoicesTotal,
    periodPaymentsTotal,
    closingBalance,
    isClosingAdvance,
    entries: periodEntries,
  };
}

/**
 * Helper to check if a date falls within the selected period filter
 */
export function isDateInFilter(
  dateStr: string,
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): boolean {
  if (filter === 'all') return true;

  const todayStr = getTodayDateString();
  const dateOnly = dateStr.split('T')[0];

  if (filter === 'today') {
    return dateOnly === todayStr;
  }

  const dateObj = new Date(dateOnly + 'T00:00:00');
  const now = new Date();

  if (filter === 'this_week') {
    const dayOfWeek = now.getDay(); // 0 is Sun
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return dateObj >= monday && dateObj <= sunday;
  }

  if (filter === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return dateObj >= firstDay && dateObj <= lastDay;
  }

  if (filter === 'custom') {
    if (customStart && dateOnly < customStart) return false;
    if (customEnd && dateOnly > customEnd) return false;
    return true;
  }

  return true;
}

/**
 * Calculate full analytics summary for Dashboard and Analytics screens
 */
export function calculateAnalytics(
  parties: Party[],
  invoices: PartyInvoice[],
  partyPayments: PartyPayment[],
  companyPayments: CompanyPayment[],
  period: DateFilterType = 'all',
  customStart?: string,
  customEnd?: string,
  companies?: Company[],
  companyInvoices?: CompanyInvoice[]
): AnalyticsSummary {
  const todayStr = getTodayDateString();

  // Filtered lists based on period
  const filteredInvoices = invoices.filter((i) =>
    isDateInFilter(i.date, period, customStart, customEnd)
  );
  const filteredPartyPayments = partyPayments.filter((p) =>
    isDateInFilter(p.date, period, customStart, customEnd)
  );
  const filteredCompanyPayments = companyPayments.filter((c) =>
    isDateInFilter(c.date, period, customStart, customEnd)
  );

  const hasUniversalCompanies = Boolean(companies && companies.length > 0);
  const filteredCompanyInvoices = (companyInvoices || []).filter((ci) =>
    isDateInFilter(ci.date, period, customStart, customEnd)
  );

  // Overall totals for Market Receivable and Company Outstanding
  // (Receivables and Outstandings reflect current balance, while invoiced/recovered reflect selected period if filtered)
  const totalMarketInvoices = (period === 'all' ? invoices : filteredInvoices).reduce(
    (sum, i) => sum + (Number(i.amount) || 0),
    0
  );
  const totalMarketRecovered = (period === 'all' ? partyPayments : filteredPartyPayments).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  // Active parties balance calculation
  const partySummaries = parties.map((party) =>
    calculatePartyBalance(party.id, invoices, partyPayments)
  );
  const marketReceivable = partySummaries.reduce((sum, p) => sum + p.currentBalance, 0);

  // Company balances: if universal companies provided, calculate from them; otherwise fallback to legacy formula
  const totalCompanyLiability = hasUniversalCompanies
    ? (period === 'all' ? (companyInvoices || []) : filteredCompanyInvoices).reduce(
        (sum, ci) => sum + (Number(ci.amount) || 0),
        0
      )
    : (period === 'all' ? invoices : filteredInvoices).reduce(
        (sum, i) => sum + (Number(i.amount) || 0),
        0
      );

  const totalCompanyPaid = (period === 'all' ? companyPayments : filteredCompanyPayments).reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );

  let companyOutstanding = 0;
  if (hasUniversalCompanies && companies) {
    companyOutstanding = companies.reduce(
      (sum, comp) =>
        sum + calculateSingleCompanyBalance(comp.id, companyInvoices || [], companyPayments).currentBalance,
      0
    );
  } else {
    const companyBalance = calculateCompanyBalance(invoices, companyPayments);
    companyOutstanding = companyBalance.outstanding;
  }

  // Net Outstanding Difference (Market Receivable minus Company Payable)
  // Strictly labeled as Net Outstanding Difference, NOT profit
  const netOutstandingDifference = marketReceivable - companyOutstanding;

  // Today's numbers
  const todayRecovery = partyPayments
    .filter((p) => p.date === todayStr)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const todayCompanyPayment = companyPayments
    .filter((c) => c.date === todayStr)
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return {
    marketReceivable,
    marketInvoiced: totalMarketInvoices,
    marketRecovered: totalMarketRecovered,
    companyLiability: totalCompanyLiability,
    companyPaid: totalCompanyPaid,
    companyOutstanding,
    netOutstandingDifference,
    todayRecovery,
    todayCompanyPayment,
    activePartiesCount: parties.length,
    invoicesCount: filteredInvoices.length,
    partyPaymentsCount: filteredPartyPayments.length,
    companyPaymentsCount: filteredCompanyPayments.length,
    companiesCount: companies?.length,
    companyInvoicesCount: companyInvoices?.length,
  };
}

/**
 * Returns compiled list of recent transactions across the app sorted newest first
 */
export function getRecentTransactions(
  invoices: PartyInvoice[],
  partyPayments: PartyPayment[],
  companyPayments: CompanyPayment[],
  limit = 20,
  companyInvoices?: CompanyInvoice[]
): RecentTransactionItem[] {
  const items: RecentTransactionItem[] = [];

  for (const inv of invoices) {
    items.push({
      id: `inv-${inv.id}`,
      date: inv.date,
      timestamp: inv.createdAt || inv.date,
      title: inv.partyName,
      subtitle: `Invoice #${inv.invoiceNumber}${inv.description ? ` • ${inv.description}` : ''}`,
      amount: inv.amount,
      type: 'invoice',
      direction: 'liability',
    });
  }

  for (const pmt of partyPayments) {
    items.push({
      id: `pmt-${pmt.id}`,
      date: pmt.date,
      timestamp: pmt.createdAt || pmt.date,
      title: pmt.partyName,
      subtitle: `Received via ${pmt.paymentMethod}${pmt.reference ? ` • Ref: ${pmt.reference}` : ''}`,
      amount: pmt.amount,
      type: 'party_payment',
      direction: 'incoming',
    });
  }

  for (const cpmt of companyPayments) {
    items.push({
      id: `cpmt-${cpmt.id}`,
      date: cpmt.date,
      timestamp: cpmt.createdAt || cpmt.date,
      title: cpmt.companyName || 'Company',
      subtitle: `Company Paid via ${cpmt.paymentMethod}${cpmt.reference ? ` • Receipt: ${cpmt.reference}` : ''}`,
      amount: cpmt.amount,
      type: 'company_payment',
      direction: 'outgoing',
    });
  }

  if (companyInvoices) {
    for (const cinv of companyInvoices) {
      items.push({
        id: `cinv-${cinv.id}`,
        date: cinv.date,
        timestamp: cinv.createdAt || cinv.date,
        title: cinv.companyName || 'Company Purchase',
        subtitle: `Purchase #${cinv.invoiceNumber}${cinv.description ? ` • ${cinv.description}` : ''}`,
        amount: cinv.amount,
        type: 'company_invoice',
        direction: 'liability',
      });
    }
  }

  // Sort descending by date, then timestamp
  items.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.timestamp.localeCompare(a.timestamp);
  });

  return items.slice(0, limit);
}

/**
 * Calculates daily collection breakdown strictly from actual Party Payment transactions for a specific date.
 * Company payments are strictly excluded.
 */
export function calculateDailyCollection(
  partyPayments: PartyPayment[],
  dateStr: string
): DailyCollectionSummary {
  const filteredPayments = partyPayments.filter((p) => p.date === dateStr);

  let cashCollection = 0;
  let bankCollection = 0;
  let easypaisaCollection = 0;
  let jazzCashCollection = 0;
  let otherCollection = 0;

  for (const payment of filteredPayments) {
    const amt = Number(payment.amount) || 0;
    const method = (payment.paymentMethod || '').trim().toLowerCase();

    if (method === 'cash') {
      cashCollection += amt;
    } else if (method === 'bank' || method === 'bank account') {
      bankCollection += amt;
    } else if (method === 'easypaisa') {
      easypaisaCollection += amt;
    } else if (method === 'jazzcash') {
      jazzCashCollection += amt;
    } else {
      otherCollection += amt;
    }
  }

  const totalCollection =
    cashCollection + bankCollection + easypaisaCollection + jazzCashCollection + otherCollection;

  // Sort payments by timestamp or creation date ascending
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const timeA = a.createdAt || a.date;
    const timeB = b.createdAt || b.date;
    return timeA.localeCompare(timeB);
  });

  return {
    date: dateStr,
    cashCollection,
    bankCollection,
    easypaisaCollection,
    jazzCashCollection,
    otherCollection,
    totalCollection,
    payments: sortedPayments,
  };
}

/**
 * Calculates daily balance check (reconciliation) comparing transaction-derived expected balances
 * against user-entered actual physical/account balances.
 * Strictly avoids modifying any ledger transaction.
 */
export function calculateDailyReconciliation(
  collection: DailyCollectionSummary,
  reconInput?: Partial<DailyReconciliation>,
  companyPayments: CompanyPayment[] = []
): DailyReconciliationSummary {
  // Cash
  const openingCash = Number(reconInput?.openingCash) || 0;
  const cashExpenses = Number(reconInput?.cashExpenses) || 0;
  const expectedCash = openingCash + collection.cashCollection - cashExpenses;
  const actualCash = Number(reconInput?.actualCash) || 0;
  const cashDifference = actualCash - expectedCash;
  const isCashMatched = cashDifference === 0;

  const cash: MethodReconciliationResult = {
    method: 'Cash',
    opening: openingCash,
    collection: collection.cashCollection,
    outflow: cashExpenses,
    expected: expectedCash,
    actual: actualCash,
    difference: cashDifference,
    isMatched: isCashMatched,
  };

  // Bank
  const openingBank = Number(reconInput?.openingBank) || 0;
  const bankWithdrawals = Number(reconInput?.bankWithdrawals) || 0;
  const expectedBank = openingBank + collection.bankCollection - bankWithdrawals;
  const actualBank = Number(reconInput?.actualBank) || 0;
  const bankDifference = actualBank - expectedBank;
  const isBankMatched = bankDifference === 0;

  const bank: MethodReconciliationResult = {
    method: 'Bank Account',
    opening: openingBank,
    collection: collection.bankCollection,
    outflow: bankWithdrawals,
    expected: expectedBank,
    actual: actualBank,
    difference: bankDifference,
    isMatched: isBankMatched,
  };

  // Easypaisa
  const openingEasypaisa = Number(reconInput?.openingEasypaisa) || 0;
  const easypaisaWithdrawals = Number(reconInput?.easypaisaWithdrawals) || 0;
  const expectedEasypaisa =
    openingEasypaisa + collection.easypaisaCollection - easypaisaWithdrawals;
  const actualEasypaisa = Number(reconInput?.actualEasypaisa) || 0;
  const easypaisaDifference = actualEasypaisa - expectedEasypaisa;
  const isEasypaisaMatched = easypaisaDifference === 0;

  const easypaisa: MethodReconciliationResult = {
    method: 'Easypaisa',
    opening: openingEasypaisa,
    collection: collection.easypaisaCollection,
    outflow: easypaisaWithdrawals,
    expected: expectedEasypaisa,
    actual: actualEasypaisa,
    difference: easypaisaDifference,
    isMatched: isEasypaisaMatched,
  };

  // JazzCash
  const openingJazzCash = Number(reconInput?.openingJazzCash) || 0;
  const jazzCashWithdrawals = Number(reconInput?.jazzCashWithdrawals) || 0;
  const expectedJazzCash =
    openingJazzCash + collection.jazzCashCollection - jazzCashWithdrawals;
  const actualJazzCash = Number(reconInput?.actualJazzCash) || 0;
  const jazzCashDifference = actualJazzCash - expectedJazzCash;
  const isJazzCashMatched = jazzCashDifference === 0;

  const jazzCash: MethodReconciliationResult = {
    method: 'JazzCash',
    opening: openingJazzCash,
    collection: collection.jazzCashCollection,
    outflow: jazzCashWithdrawals,
    expected: expectedJazzCash,
    actual: actualJazzCash,
    difference: jazzCashDifference,
    isMatched: isJazzCashMatched,
  };

  // Net difference across all accounts
  const totalDifference =
    cashDifference + bankDifference + easypaisaDifference + jazzCashDifference;
  const isAllMatched = isCashMatched && isBankMatched && isEasypaisaMatched && isJazzCashMatched;

  // Company deposits for this date (strictly separated)
  const todayCompanyPayment = companyPayments
    .filter((c) => c.date === collection.date)
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return {
    date: collection.date,
    cash,
    bank,
    easypaisa,
    jazzCash,
    totalDifference,
    isAllMatched,
    todayCompanyPayment,
  };
}
