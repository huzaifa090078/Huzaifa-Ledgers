import { describe, it, expect } from 'vitest';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment, Company, CompanyInvoice } from '../src/types';
import {
  calculatePartyBalance,
  calculateCompanyBalance,
  calculateSingleCompanyBalance,
  getCompanyLedgerTimeline,
  calculateCompanyPeriodLedger,
  calculateAnalytics,
  formatPKR,
  getPartyLedgerTimeline,
  getRecentTransactions,
  formatLocalTimestamp,
  formatLocalTime,
  checkCompanyInvoiceUniqueness,
  parseToYYYYMMDD,
  formatDateDisplay,
  formatDate,
} from '../src/services/accounting';

describe('Login Smart Technology Ledger - Accounting Engine Tests', () => {
  describe('Rule 26: Section 26 Acceptance Scenario Verification', () => {
    it('executes the full step-by-step acceptance workflow and strictly matches expected balances', () => {
      // Setup parties
      const partyA: Party = {
        id: 'party-a',
        name: 'Party A',
        createdAt: '2026-09-21T10:00:00Z',
        updatedAt: '2026-09-21T10:00:00Z',
      };
      const partyB: Party = {
        id: 'party-b',
        name: 'Party B',
        createdAt: '2026-09-21T10:00:00Z',
        updatedAt: '2026-09-21T10:00:00Z',
      };
      const parties = [partyA, partyB];

      // Invoices state
      let invoices: PartyInvoice[] = [];
      let partyPayments: PartyPayment[] = [];
      let companyPayments: CompanyPayment[] = [];

      // Step 1: Party A invoice = Rs 30,000, Party B invoice = Rs 45,000
      invoices.push({
        id: 'inv-1',
        invoiceNumber: 'A-1025',
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-21',
        amount: 30000,
        createdAt: '2026-09-21T10:05:00Z',
        updatedAt: '2026-09-21T10:05:00Z',
      });
      invoices.push({
        id: 'inv-2',
        invoiceNumber: 'B-1026',
        partyId: partyB.id,
        partyName: partyB.name,
        date: '2026-09-21',
        amount: 45000,
        createdAt: '2026-09-21T10:10:00Z',
        updatedAt: '2026-09-21T10:10:00Z',
      });

      // Expected: Market Receivable = Rs 75,000, Company Payable = Rs 75,000
      let partyABalance = calculatePartyBalance(partyA.id, invoices, partyPayments);
      let partyBBalance = calculatePartyBalance(partyB.id, invoices, partyPayments);
      let companyBalance = calculateCompanyBalance(invoices, companyPayments);
      let analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments);

      expect(partyABalance.currentBalance).toBe(30000);
      expect(partyBBalance.currentBalance).toBe(45000);
      expect(analytics.marketReceivable).toBe(75000);
      expect(companyBalance.outstanding).toBe(75000);

      // Step 2: Party A pays Rs 10,000 cash
      partyPayments.push({
        id: 'pmt-1',
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-21',
        amount: 10000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-21T11:00:00Z',
        updatedAt: '2026-09-21T11:00:00Z',
      });

      // Expected: Party A = Rs 20,000, Market Receivable = Rs 65,000, Company Payable = Rs 75,000 (UNCHANGED!)
      partyABalance = calculatePartyBalance(partyA.id, invoices, partyPayments);
      partyBBalance = calculatePartyBalance(partyB.id, invoices, partyPayments);
      companyBalance = calculateCompanyBalance(invoices, companyPayments);
      analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments);

      expect(partyABalance.currentBalance).toBe(20000);
      expect(analytics.marketReceivable).toBe(65000);
      expect(companyBalance.outstanding).toBe(75000); // Strict Rule 3: Party payment does NOT reduce company payable

      // Step 3: Pay company Rs 15,000 bank
      companyPayments.push({
        id: 'cpmt-1',
        date: '2026-09-21',
        amount: 15000,
        paymentMethod: 'Bank',
        reference: 'TR-101',
        createdAt: '2026-09-21T12:00:00Z',
        updatedAt: '2026-09-21T12:00:00Z',
      });

      // Expected: Market Receivable = Rs 65,000 (UNCHANGED!), Company Payable = Rs 60,000
      partyABalance = calculatePartyBalance(partyA.id, invoices, partyPayments);
      companyBalance = calculateCompanyBalance(invoices, companyPayments);
      analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments);

      expect(partyABalance.currentBalance).toBe(20000); // Strict Rule 4: Company payment does NOT reduce party balance
      expect(analytics.marketReceivable).toBe(65000);
      expect(companyBalance.outstanding).toBe(60000);

      // Step 4: Party B pays Rs 20,000
      partyPayments.push({
        id: 'pmt-2',
        partyId: partyB.id,
        partyName: partyB.name,
        date: '2026-09-21',
        amount: 20000,
        paymentMethod: 'Bank',
        createdAt: '2026-09-21T13:00:00Z',
        updatedAt: '2026-09-21T13:00:00Z',
      });

      // Expected: Market Receivable = Rs 45,000, Company Payable = Rs 60,000 (UNCHANGED!)
      partyBBalance = calculatePartyBalance(partyB.id, invoices, partyPayments);
      companyBalance = calculateCompanyBalance(invoices, companyPayments);
      analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments);

      expect(partyBBalance.currentBalance).toBe(25000);
      expect(analytics.marketReceivable).toBe(45000);
      expect(companyBalance.outstanding).toBe(60000);

      // Step 5: Pay company Rs 25,000
      companyPayments.push({
        id: 'cpmt-2',
        date: '2026-09-21',
        amount: 25000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-21T14:00:00Z',
        updatedAt: '2026-09-21T14:00:00Z',
      });

      // Expected: Market Receivable = Rs 45,000, Company Payable = Rs 35,000
      companyBalance = calculateCompanyBalance(invoices, companyPayments);
      analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments);

      expect(analytics.marketReceivable).toBe(45000);
      expect(companyBalance.outstanding).toBe(35000);

      // Verify Net Outstanding Difference = 45000 - 35000 = 10000
      expect(analytics.netOutstandingDifference).toBe(10000);
    });
  });

  describe('Rule 5 & 6 & 7: Transaction Modifications & Deletions', () => {
    it('editing an invoice updates both Party balance and Company liability', () => {
      const party: Party = { id: 'p1', name: 'Test Shop', createdAt: '', updatedAt: '' };
      let invoices: PartyInvoice[] = [
        { id: 'i1', invoiceNumber: '001', partyId: 'p1', partyName: 'Test Shop', date: '2026-09-21', amount: 50000, createdAt: '', updatedAt: '' }
      ];
      let companyPayments: CompanyPayment[] = [];
      let partyPayments: PartyPayment[] = [];

      expect(calculatePartyBalance('p1', invoices, partyPayments).currentBalance).toBe(50000);
      expect(calculateCompanyBalance(invoices, companyPayments).outstanding).toBe(50000);

      // Edit invoice amount to 40,000
      invoices[0].amount = 40000;
      expect(calculatePartyBalance('p1', invoices, partyPayments).currentBalance).toBe(40000);
      expect(calculateCompanyBalance(invoices, companyPayments).outstanding).toBe(40000);

      // Delete invoice
      invoices = [];
      expect(calculatePartyBalance('p1', invoices, partyPayments).currentBalance).toBe(0);
      expect(calculateCompanyBalance(invoices, companyPayments).outstanding).toBe(0);
    });

    it('editing a party payment only changes party balance, not company', () => {
      const party: Party = { id: 'p1', name: 'Test Shop', createdAt: '', updatedAt: '' };
      const invoices: PartyInvoice[] = [
        { id: 'i1', invoiceNumber: '001', partyId: 'p1', partyName: 'Test Shop', date: '2026-09-21', amount: 50000, createdAt: '', updatedAt: '' }
      ];
      let partyPayments: PartyPayment[] = [
        { id: 'pmt1', partyId: 'p1', partyName: 'Test Shop', date: '2026-09-21', amount: 10000, paymentMethod: 'Cash', createdAt: '', updatedAt: '' }
      ];
      const companyPayments: CompanyPayment[] = [];

      expect(calculatePartyBalance('p1', invoices, partyPayments).currentBalance).toBe(40000);
      expect(calculateCompanyBalance(invoices, companyPayments).outstanding).toBe(50000);

      // Edit payment to 20,000
      partyPayments[0].amount = 20000;
      expect(calculatePartyBalance('p1', invoices, partyPayments).currentBalance).toBe(30000);
      expect(calculateCompanyBalance(invoices, companyPayments).outstanding).toBe(50000); // Unchanged
    });
  });

  describe('Rule 8: Overpayment / Advance Handling', () => {
    it('properly classifies excess payment as advance without displaying negative balance', () => {
      const invoices: PartyInvoice[] = [
        { id: 'i1', invoiceNumber: '001', partyId: 'p1', partyName: 'Advance Shop', date: '2026-09-21', amount: 10000, createdAt: '', updatedAt: '' }
      ];
      const partyPayments: PartyPayment[] = [
        { id: 'pmt1', partyId: 'p1', partyName: 'Advance Shop', date: '2026-09-21', amount: 15000, paymentMethod: 'Bank', createdAt: '', updatedAt: '' }
      ];

      const balance = calculatePartyBalance('p1', invoices, partyPayments);
      expect(balance.currentBalance).toBe(0);
      expect(balance.isAdvance).toBe(true);
      expect(balance.advanceAmount).toBe(5000);
    });
  });

  describe('Currency & Pakistani Formatting', () => {
    it('formats numbers with Rs prefix and comma separators correctly', () => {
      expect(formatPKR(1000)).toBe('Rs 1,000');
      expect(formatPKR(10000)).toBe('Rs 10,000');
      expect(formatPKR(100000)).toBe('Rs 100,000');
      expect(formatPKR(1000000)).toBe('Rs 1,000,000');
      expect(formatPKR(0)).toBe('Rs 0');
    });
  });

  describe('Ledger Timeline Calculation', () => {
    it('produces chronological ledger entries with correct running balances', () => {
      const invoices: PartyInvoice[] = [
        { id: 'i1', invoiceNumber: 'A-1025', partyId: 'p1', partyName: 'Party A', date: '2026-09-21', amount: 30000, createdAt: '2026-09-21T09:00:00Z', updatedAt: '' }
      ];
      const payments: PartyPayment[] = [
        { id: 'pmt1', partyId: 'p1', partyName: 'Party A', date: '2026-09-21', amount: 5000, paymentMethod: 'Cash', createdAt: '2026-09-21T10:00:00Z', updatedAt: '' },
        { id: 'pmt2', partyId: 'p1', partyName: 'Party A', date: '2026-09-22', amount: 5000, paymentMethod: 'Bank', createdAt: '2026-09-22T10:00:00Z', updatedAt: '' }
      ];

      const timeline = getPartyLedgerTimeline('p1', invoices, payments);
      expect(timeline.entries).toHaveLength(3);

      expect(timeline.entries[0].debit).toBe(30000);
      expect(timeline.entries[0].balance).toBe(30000);

      expect(timeline.entries[1].credit).toBe(5000);
      expect(timeline.entries[1].balance).toBe(25000);

      expect(timeline.entries[2].credit).toBe(5000);
      expect(timeline.entries[2].balance).toBe(20000);

      expect(timeline.finalBalance).toBe(20000);
    });
  });

  describe('Backup & Restore Schema Validation', () => {
    it('validates good backup payload structure and rejects malformed payloads', async () => {
      const { validateBackupPayload } = await import('../src/services/backup');
      const validPayload = {
        version: 1,
        appName: 'Login Smart Technology',
        exportedAt: '2026-09-21T12:00:00Z',
        parties: [],
        invoices: [],
        partyPayments: [],
        companyPayments: [],
      };
      expect(validateBackupPayload(validPayload).valid).toBe(true);

      expect(validateBackupPayload(null).valid).toBe(false);
      expect(validateBackupPayload({ parties: 'not-an-array' }).valid).toBe(false);
      expect(validateBackupPayload({ parties: [] }).valid).toBe(false); // missing invoices
    });
  });

  describe('Date Filtering Logic', () => {
    it('correctly filters dates according to selected filter preset', async () => {
      const { isDateInFilter } = await import('../src/services/accounting');
      expect(isDateInFilter('2026-09-21', 'all')).toBe(true);

      // Custom range
      expect(isDateInFilter('2026-09-15', 'custom', '2026-09-10', '2026-09-20')).toBe(true);
      expect(isDateInFilter('2026-09-25', 'custom', '2026-09-10', '2026-09-20')).toBe(false);
      expect(isDateInFilter('2026-09-05', 'custom', '2026-09-10', '2026-09-20')).toBe(false);
    });
  });

  describe('Daily Collection & Reconciliation Acceptance Tests', () => {
    it('executes the exact user test scenario for daily collection and cash reconciliation', async () => {
      const { calculateDailyCollection, calculateDailyReconciliation } = await import(
        '../src/services/accounting'
      );

      const targetDate = '2026-09-21';

      // Setup 3 party payments:
      // Party A — Cash — Rs 5,000
      // Party B — Cash — Rs 10,000
      // Party C — Bank — Rs 10,000
      const partyPayments: PartyPayment[] = [
        {
          id: 'pmt-a',
          partyId: 'p-a',
          partyName: 'Party A',
          date: targetDate,
          amount: 5000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-21T10:00:00Z',
          updatedAt: '2026-09-21T10:00:00Z',
        },
        {
          id: 'pmt-b',
          partyId: 'p-b',
          partyName: 'Party B',
          date: targetDate,
          amount: 10000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-21T11:00:00Z',
          updatedAt: '2026-09-21T11:00:00Z',
        },
        {
          id: 'pmt-c',
          partyId: 'p-c',
          partyName: 'Party C',
          date: targetDate,
          amount: 10000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-21T12:00:00Z',
          updatedAt: '2026-09-21T12:00:00Z',
        },
      ];

      // Calculate Daily Collection
      const collection = calculateDailyCollection(partyPayments, targetDate);

      // Verify Collection breakdown
      expect(collection.cashCollection).toBe(15000);
      expect(collection.bankCollection).toBe(10000);
      expect(collection.totalCollection).toBe(25000);
      expect(collection.payments).toHaveLength(3);

      // Scenario 1: Opening Cash = Rs 5,000, Actual Cash = Rs 20,000
      // Expected Cash before expenses: 5,000 + 15,000 = 20,000
      const reconInputMatched = {
        openingCash: 5000,
        cashExpenses: 0,
        actualCash: 20000,
      };

      const reconMatched = calculateDailyReconciliation(collection, reconInputMatched);
      expect(reconMatched.cash.expected).toBe(20000);
      expect(reconMatched.cash.difference).toBe(0);
      expect(reconMatched.cash.isMatched).toBe(true);

      // Scenario 2: If actual cash = Rs 19,000
      // Cash Difference = 19,000 - 20,000 = -Rs 1,000
      // Status = Difference (isMatched = false)
      const reconInputDiff = {
        openingCash: 5000,
        cashExpenses: 0,
        actualCash: 19000,
      };

      const reconDiff = calculateDailyReconciliation(collection, reconInputDiff);
      expect(reconDiff.cash.expected).toBe(20000);
      expect(reconDiff.cash.difference).toBe(-1000);
      expect(reconDiff.cash.isMatched).toBe(false);
    });

    it('strictly isolates company payments from party collections', async () => {
      const { calculateDailyCollection, calculateDailyReconciliation } = await import(
        '../src/services/accounting'
      );

      const targetDate = '2026-09-21';

      const partyPayments: PartyPayment[] = [
        {
          id: 'pmt-1',
          partyId: 'p-1',
          partyName: 'Ali Mobiles',
          date: targetDate,
          amount: 30000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-21T10:00:00Z',
          updatedAt: '2026-09-21T10:00:00Z',
        },
      ];

      const companyPayments: CompanyPayment[] = [
        {
          id: 'cpmt-1',
          date: targetDate,
          amount: 25000,
          paymentMethod: 'Cash',
          reference: 'DEP-101',
          createdAt: '2026-09-21T14:00:00Z',
          updatedAt: '2026-09-21T14:00:00Z',
        },
      ];

      const collection = calculateDailyCollection(partyPayments, targetDate);

      // Party collection is strictly Rs 30,000 (company payment is NOT added to collection)
      expect(collection.totalCollection).toBe(30000);
      expect(collection.cashCollection).toBe(30000);

      const recon = calculateDailyReconciliation(collection, {}, companyPayments);
      expect(recon.todayCompanyPayment).toBe(25000);
    });

    it('properly segregates collection by date', async () => {
      const { calculateDailyCollection } = await import('../src/services/accounting');

      const partyPayments: PartyPayment[] = [
        {
          id: 'pmt-yesterday',
          partyId: 'p-1',
          partyName: 'Shop A',
          date: '2026-09-20',
          amount: 25000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-20T10:00:00Z',
          updatedAt: '2026-09-20T10:00:00Z',
        },
        {
          id: 'pmt-today',
          partyId: 'p-2',
          partyName: 'Shop B',
          date: '2026-09-21',
          amount: 30000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-21T10:00:00Z',
          updatedAt: '2026-09-21T10:00:00Z',
        },
      ];

      const yesterdayCol = calculateDailyCollection(partyPayments, '2026-09-20');
      const todayCol = calculateDailyCollection(partyPayments, '2026-09-21');

      expect(yesterdayCol.totalCollection).toBe(25000);
      expect(yesterdayCol.cashCollection).toBe(25000);
      expect(yesterdayCol.bankCollection).toBe(0);

      expect(todayCol.totalCollection).toBe(30000);
      expect(todayCol.cashCollection).toBe(0);
      expect(todayCol.bankCollection).toBe(30000);
    });

    it('generates Daily Collection PDF containing ONLY collection info and strictly NO Paisa Check or Reconciliation content', async () => {
      const { calculateDailyCollection } = await import('../src/services/accounting');
      const { generateDailyCollectionPDF } = await import('../src/services/pdf');

      const partyPayments: PartyPayment[] = [
        {
          id: 'pmt-1',
          partyId: 'p-1',
          partyName: 'Ali Mobiles',
          date: '2026-09-21',
          amount: 15000,
          paymentMethod: 'Cash',
          reference: 'REC-001',
          note: 'Full recovery',
          createdAt: '2026-09-21T10:30:00Z',
          updatedAt: '2026-09-21T10:30:00Z',
        },
        {
          id: 'pmt-2',
          partyId: 'p-2',
          partyName: 'Bilal Traders',
          date: '2026-09-21',
          amount: 10000,
          paymentMethod: 'Bank',
          reference: 'TR-555',
          createdAt: '2026-09-21T11:45:00Z',
          updatedAt: '2026-09-21T11:45:00Z',
        },
      ];

      const collection = calculateDailyCollection(partyPayments, '2026-09-21');
      const pdfResult = generateDailyCollectionPDF(collection, 'Test Salesman');

      expect(pdfResult.filename).toBe('Daily_Collection_21-09-2026.pdf');
      expect(pdfResult.pdfBlob.size).toBeGreaterThan(1000);

      // Inspect the raw text of the generated PDF
      const pdfText = await pdfResult.pdfBlob.text();

      // Must include collection elements
      expect(pdfText).toContain('DAILY COLLECTION');
      expect(pdfText).toContain("TODAY'S COLLECTION");
      expect(pdfText).toContain('Ali Mobiles');
      expect(pdfText).toContain('Bilal Traders');
      expect(pdfText).toContain('Total Collection');

      // MUST NOT include any reconciliation / check terms
      expect(pdfText).not.toContain('Paisa Check');
      expect(pdfText).not.toContain('Collection Check');
      expect(pdfText).not.toContain('Expected Cash');
      expect(pdfText).not.toContain('Actual Cash');
      expect(pdfText).not.toContain('Opening Cash');
      expect(pdfText).not.toContain('Closing Cash');
      expect(pdfText).not.toContain('Reconciliation');
      expect(pdfText).not.toContain('RECONCILIATION');
      expect(pdfText).not.toContain('Difference');
      expect(pdfText).not.toContain('Matched');
    });
  });

  describe('Date-Range Party Ledger Calculations & Reports', () => {
    const testParty: Party = {
      id: 'party-dr-1',
      name: 'Modern Electronics',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const invoices: PartyInvoice[] = [
      {
        id: 'inv-prior-1',
        invoiceNumber: 'INV-101',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-01',
        amount: 50000,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'inv-period-1',
        invoiceNumber: 'INV-102',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-11',
        amount: 25000,
        createdAt: '2026-09-11T10:00:00Z',
        updatedAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 'inv-after-1',
        invoiceNumber: 'INV-103',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-20',
        amount: 15000,
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z',
      },
    ];

    const payments: PartyPayment[] = [
      {
        id: 'pmt-prior-1',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-05',
        amount: 20000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-05T12:00:00Z',
        updatedAt: '2026-09-05T12:00:00Z',
      },
      {
        id: 'pmt-period-1',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-14',
        amount: 10000,
        paymentMethod: 'Bank',
        createdAt: '2026-09-14T15:00:00Z',
        updatedAt: '2026-09-14T15:00:00Z',
      },
      {
        id: 'pmt-after-1',
        partyId: testParty.id,
        partyName: testParty.name,
        date: '2026-09-22',
        amount: 5000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-22T11:00:00Z',
        updatedAt: '2026-09-22T11:00:00Z',
      },
    ];

    it('calculates full ledger correctly when no date range is provided', async () => {
      const { calculatePartyPeriodLedger } = await import('../src/services/accounting');
      const res = calculatePartyPeriodLedger(testParty.id, invoices, payments);

      expect(res.isDateRange).toBe(false);
      expect(res.openingBalance).toBe(0);
      expect(res.periodInvoicesTotal).toBe(90000);
      expect(res.periodPaymentsTotal).toBe(35000);
      expect(res.closingBalance).toBe(55000);
      expect(res.entries.length).toBe(6);
    });

    it('calculates date range ledger with accurate Opening Balance and Period Totals', async () => {
      const { calculatePartyPeriodLedger } = await import('../src/services/accounting');
      // Date range: 2026-09-10 to 2026-09-15
      // Prior transactions (< 2026-09-10):
      // - inv-prior-1: +50,000
      // - pmt-prior-1: -20,000
      // Expected Opening Balance = +30,000
      // Period transactions (2026-09-10 to 2026-09-15):
      // - inv-period-1 (2026-09-11): +25,000
      // - pmt-period-1 (2026-09-14): -10,000
      // Expected Period Invoices = 25,000
      // Expected Period Payments = 10,000
      // Expected Closing Balance = 30,000 + 25,000 - 10,000 = 45,000
      const res = calculatePartyPeriodLedger(testParty.id, invoices, payments, '2026-09-10', '2026-09-15');

      expect(res.isDateRange).toBe(true);
      expect(res.openingBalance).toBe(30000);
      expect(res.isOpeningAdvance).toBe(false);
      expect(res.periodInvoicesTotal).toBe(25000);
      expect(res.periodPaymentsTotal).toBe(10000);
      expect(res.closingBalance).toBe(45000);
      expect(res.isClosingAdvance).toBe(false);
      expect(res.entries.length).toBe(2);
      expect(res.entries[0].id).toBe('inv-period-1');
      expect(res.entries[1].id).toBe('pmt-period-1');
    });

    it('correctly handles advance/negative opening balance when payments exceed invoices prior to start date', async () => {
      const { calculatePartyPeriodLedger } = await import('../src/services/accounting');
      const advancePayments: PartyPayment[] = [
        {
          id: 'pmt-adv-1',
          partyId: testParty.id,
          partyName: testParty.name,
          date: '2026-09-05',
          amount: 80000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-05T10:00:00Z',
          updatedAt: '2026-09-05T10:00:00Z',
        },
      ];

      // Prior: inv = 50,000, pmt = 80,000 -> Opening Balance = -30,000 (Advance)
      const res = calculatePartyPeriodLedger(testParty.id, invoices, advancePayments, '2026-09-10', '2026-09-15');

      expect(res.openingBalance).toBe(-30000);
      expect(res.isOpeningAdvance).toBe(true);
      // Period: inv = 25,000, pmt = 0
      // Closing = -30,000 + 25,000 = -5,000 (still Advance)
      expect(res.closingBalance).toBe(-5000);
      expect(res.isClosingAdvance).toBe(true);
    });

    it('generates Party Ledger PDF with date range containing Opening Balance row and correct filename', async () => {
      const { generatePartyLedgerPDF } = await import('../src/services/pdf');
      const result = generatePartyLedgerPDF(
        testParty,
        invoices,
        payments,
        'Test Representative',
        '2026-09-10',
        '2026-09-15'
      );

      expect(result.filename).toBe('Ledger_Modern_Electronics_10-09-2026_to_15-09-2026.pdf');
      expect(result.pdfBlob.size).toBeGreaterThan(1000);

      const pdfText = await result.pdfBlob.text();
      expect(pdfText).toContain('Opening Balance');
      expect(pdfText).toContain('Closing Balance');
      expect(pdfText).toContain('10-09-2026 to 15-09-2026');
    });

    it('builds short, plain-text WhatsApp message with exact 4 fields: Party, Last Balance, Recent Payment, Pending Balance', async () => {
      const { buildLedgerSummaryText } = await import('../src/services/share');
      const partyObj: Party = {
        id: 'party-abc',
        name: 'ABC Traders',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };
      const invList: PartyInvoice[] = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-100',
          partyId: partyObj.id,
          partyName: partyObj.name,
          date: '2026-09-01',
          amount: 5000,
          createdAt: '2026-09-01T10:00:00Z',
          updatedAt: '2026-09-01T10:00:00Z',
        },
      ];
      const pmtList: PartyPayment[] = [
        {
          id: 'pmt-1',
          partyId: partyObj.id,
          partyName: partyObj.name,
          date: '2026-09-02',
          amount: 1000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-02T10:00:00Z',
          updatedAt: '2026-09-02T10:00:00Z',
        },
      ];

      const text = buildLedgerSummaryText(partyObj, invList, pmtList);
      expect(text).toContain('Party: ABC Traders');
      expect(text).toContain('Last Balance: Rs 5,000');
      expect(text).toContain('Recent Payment: Rs 1,000');
      expect(text).toContain('Pending Balance: Rs 4,000');
      // Verify strictly NO long lists or extra tables in normal share text
      expect(text).not.toContain('Total Invoices:');
      expect(text).not.toContain('Opening Balance:');
    });
  });

  describe('Local Timezone & Timestamp Formatting (Asia/Karachi UTC+05:00)', () => {
    it('correctly converts UTC ISO string to PKT date and 12-hour time', () => {
      // 11:10 UTC -> 16:10 (04:10 PM) PKT
      const formatted = formatLocalTimestamp('2026-09-24T11:10:00.000Z');
      expect(formatted).toBe('24-09-2026 04:10 PM');
    });

    it('correctly handles midnight date rollover to next day in PKT', () => {
      // 20:30 UTC on 24th -> +5h = 01:30 AM on 25th in PKT
      const formatted = formatLocalTimestamp('2026-09-24T20:30:00.000Z');
      expect(formatted).toBe('25-09-2026 01:30 AM');
    });

    it('returns empty string for undefined, empty or invalid timestamps', () => {
      expect(formatLocalTimestamp(undefined)).toBe('');
      expect(formatLocalTimestamp('')).toBe('');
      expect(formatLocalTimestamp('invalid-date')).toBe('');
    });

    it('correctly formats local time only', () => {
      expect(formatLocalTime('2026-09-24T11:10:00.000Z')).toBe('04:10 PM');
      expect(formatLocalTime('2026-09-24T05:00:00.000Z')).toBe('10:00 AM');
      expect(formatLocalTime('')).toBe('');
    });
  });

  describe('Universal Company Ledger System Tests', () => {
    const comp1: Company = {
      id: 'comp-1',
      name: 'Login Smart Technology',
      phone: '03001234567',
      address: 'Lahore, Pakistan',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const comp2: Company = {
      id: 'comp-2',
      name: 'ABC Traders',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    it('calculates single company balance correctly for normal, advance, and zero balances', () => {
      const invoices: CompanyInvoice[] = [
        {
          id: 'ci-1',
          companyId: comp1.id,
          invoiceNumber: 'INV-001',
          date: '2026-09-10',
          amount: 100000,
          createdAt: '2026-09-10T10:00:00Z',
          updatedAt: '2026-09-10T10:00:00Z',
        },
      ];
      const payments: CompanyPayment[] = [
        {
          id: 'cp-1',
          companyId: comp1.id,
          date: '2026-09-12',
          amount: 30000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-12T10:00:00Z',
          updatedAt: '2026-09-12T10:00:00Z',
        },
      ];

      // Normal balance: 100,000 - 30,000 = 70,000 outstanding
      const bal1 = calculateSingleCompanyBalance(comp1.id, invoices, payments);
      expect(bal1.totalInvoices).toBe(100000);
      expect(bal1.totalPayments).toBe(30000);
      expect(bal1.currentBalance).toBe(70000);
      expect(bal1.isAdvance).toBe(false);
      expect(bal1.advanceAmount).toBe(0);

      // Advance balance: Add payment of 80,000 (total paid = 110,000 > 100,000)
      payments.push({
        id: 'cp-2',
        companyId: comp1.id,
        date: '2026-09-15',
        amount: 80000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      });
      const balAdvance = calculateSingleCompanyBalance(comp1.id, invoices, payments);
      expect(balAdvance.currentBalance).toBe(0);
      expect(balAdvance.isAdvance).toBe(true);
      expect(balAdvance.advanceAmount).toBe(10000);

      // Zero balance for comp2 (no transactions)
      const balComp2 = calculateSingleCompanyBalance(comp2.id, invoices, payments);
      expect(balComp2.currentBalance).toBe(0);
      expect(balComp2.totalInvoices).toBe(0);
      expect(balComp2.totalPayments).toBe(0);
      expect(balComp2.isAdvance).toBe(false);
    });

    it('generates chronological company ledger timeline with running balance', () => {
      const invoices: CompanyInvoice[] = [
        {
          id: 'ci-1',
          companyId: comp1.id,
          invoiceNumber: 'INV-101',
          date: '2026-09-01',
          amount: 50000,
          createdAt: '2026-09-01T09:00:00Z',
          updatedAt: '2026-09-01T09:00:00Z',
        },
        {
          id: 'ci-2',
          companyId: comp1.id,
          invoiceNumber: 'INV-102',
          date: '2026-09-10',
          amount: 25000,
          createdAt: '2026-09-10T09:00:00Z',
          updatedAt: '2026-09-10T09:00:00Z',
        },
      ];
      const payments: CompanyPayment[] = [
        {
          id: 'cp-1',
          companyId: comp1.id,
          date: '2026-09-05',
          amount: 20000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-05T10:00:00Z',
          updatedAt: '2026-09-05T10:00:00Z',
        },
      ];

      const timeline = getCompanyLedgerTimeline(comp1.id, invoices, payments);
      expect(timeline.entries).toHaveLength(3);

      // 1. Purchase on 2026-09-01: Debit 50,000, Balance 50,000
      expect(timeline.entries[0].type).toBe('invoice');
      expect(timeline.entries[0].debit).toBe(50000);
      expect(timeline.entries[0].balance).toBe(50000);

      // 2. Payment on 2026-09-05: Credit 20,000, Balance 30,000
      expect(timeline.entries[1].type).toBe('payment');
      expect(timeline.entries[1].credit).toBe(20000);
      expect(timeline.entries[1].balance).toBe(30000);

      // 3. Purchase on 2026-09-10: Debit 25,000, Balance 55,000
      expect(timeline.entries[2].type).toBe('invoice');
      expect(timeline.entries[2].debit).toBe(25000);
      expect(timeline.entries[2].balance).toBe(55000);

      expect(timeline.finalBalance).toBe(55000);
    });

    it('calculates company period ledger with accurate opening and closing balances', () => {
      const invoices: CompanyInvoice[] = [
        {
          id: 'ci-prior',
          companyId: comp1.id,
          invoiceNumber: 'INV-PRIOR',
          date: '2026-08-15',
          amount: 40000,
          createdAt: '2026-08-15T09:00:00Z',
          updatedAt: '2026-08-15T09:00:00Z',
        },
        {
          id: 'ci-current',
          companyId: comp1.id,
          invoiceNumber: 'INV-CURR',
          date: '2026-09-05',
          amount: 30000,
          createdAt: '2026-09-05T09:00:00Z',
          updatedAt: '2026-09-05T09:00:00Z',
        },
      ];
      const payments: CompanyPayment[] = [
        {
          id: 'cp-prior',
          companyId: comp1.id,
          date: '2026-08-20',
          amount: 15000,
          paymentMethod: 'Bank',
          createdAt: '2026-08-20T10:00:00Z',
          updatedAt: '2026-08-20T10:00:00Z',
        },
        {
          id: 'cp-current',
          companyId: comp1.id,
          date: '2026-09-08',
          amount: 10000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-08T10:00:00Z',
          updatedAt: '2026-09-08T10:00:00Z',
        },
      ];

      // Period: 2026-09-01 to 2026-09-30
      // Prior balance: 40,000 - 15,000 = 25,000 opening
      // Period purchases: 30,000
      // Period payments: 10,000
      // Closing balance: 25,000 + 30,000 - 10,000 = 45,000
      const periodLedger = calculateCompanyPeriodLedger(comp1.id, invoices, payments, '2026-09-01', '2026-09-30');
      expect(periodLedger.openingBalance).toBe(25000);
      expect(periodLedger.periodInvoicesTotal).toBe(30000);
      expect(periodLedger.periodPaymentsTotal).toBe(10000);
      expect(periodLedger.closingBalance).toBe(45000);
      expect(periodLedger.entries).toHaveLength(2);
    });

    it('builds concise, plain-text WhatsApp share message for company ledger', async () => {
      const { buildCompanyLedgerSummaryText } = await import('../src/services/share');
      const invoices: CompanyInvoice[] = [
        {
          id: 'ci-1',
          companyId: comp1.id,
          invoiceNumber: 'INV-786',
          date: '2026-09-10',
          amount: 70000,
          createdAt: '2026-09-10T10:00:00Z',
          updatedAt: '2026-09-10T10:00:00Z',
        },
      ];
      const payments: CompanyPayment[] = [
        {
          id: 'cp-1',
          companyId: comp1.id,
          date: '2026-09-15',
          amount: 25000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-15T10:00:00Z',
          updatedAt: '2026-09-15T10:00:00Z',
        },
      ];

      const text = buildCompanyLedgerSummaryText(comp1, invoices, payments);
      expect(text).toContain('Company: Login Smart Technology');
      expect(text).toContain('Last Balance: Rs 70,000');
      expect(text).toContain('Recent Payment: Rs 25,000');
      expect(text).toContain('Pending Balance: Rs 45,000');
      expect(text).not.toContain('Opening Balance:');
    });

    it('calculates universal company analytics dynamically across multiple companies', () => {
      const parties: Party[] = [
        { id: 'p1', name: 'Party 1', createdAt: '', updatedAt: '' },
      ];
      const partyInvoices: PartyInvoice[] = [
        { id: 'pi-1', invoiceNumber: '1', partyId: 'p1', partyName: 'Party 1', date: '2026-09-01', amount: 80000, createdAt: '', updatedAt: '' },
      ];
      const partyPayments: PartyPayment[] = [
        { id: 'pp-1', partyId: 'p1', partyName: 'Party 1', date: '2026-09-02', amount: 20000, paymentMethod: 'Cash', createdAt: '', updatedAt: '' },
      ];

      const companiesList: Company[] = [comp1, comp2];
      const companyInvoicesList: CompanyInvoice[] = [
        { id: 'ci-1', companyId: comp1.id, invoiceNumber: 'A1', date: '2026-09-01', amount: 50000, createdAt: '', updatedAt: '' },
        { id: 'ci-2', companyId: comp2.id, invoiceNumber: 'B1', date: '2026-09-01', amount: 30000, createdAt: '', updatedAt: '' },
      ];
      const companyPaymentsList: CompanyPayment[] = [
        { id: 'cp-1', companyId: comp1.id, date: '2026-09-03', amount: 20000, paymentMethod: 'Bank', createdAt: '', updatedAt: '' },
        { id: 'cp-2', companyId: comp2.id, date: '2026-09-03', amount: 10000, paymentMethod: 'Cash', createdAt: '', updatedAt: '' },
      ];

      // Market receivable: 80,000 - 20,000 = 60,000
      // Comp1 payable: 50,000 - 20,000 = 30,000
      // Comp2 payable: 30,000 - 10,000 = 20,000
      // Total company payable: 30,000 + 20,000 = 50,000
      // Net difference: 60,000 - 50,000 = 10,000
      const analytics = calculateAnalytics(
        parties,
        partyInvoices,
        partyPayments,
        companyPaymentsList,
        'all',
        undefined,
        undefined,
        companiesList,
        companyInvoicesList
      );

      expect(analytics.marketReceivable).toBe(60000);
      expect(analytics.companyOutstanding).toBe(50000);
      expect(analytics.netOutstandingDifference).toBe(10000);
    });

    it('generates company ledger PDF containing Company Name, Opening and Closing balances', async () => {
      const { generateCompanyLedgerPDF } = await import('../src/services/pdf');
      const invoices: CompanyInvoice[] = [
        {
          id: 'ci-1',
          companyId: comp1.id,
          invoiceNumber: 'INV-100',
          date: '2026-09-12',
          amount: 50000,
          createdAt: '2026-09-12T10:00:00Z',
          updatedAt: '2026-09-12T10:00:00Z',
        },
      ];
      const payments: CompanyPayment[] = [
        {
          id: 'cp-1',
          companyId: comp1.id,
          date: '2026-09-14',
          amount: 15000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-14T10:00:00Z',
          updatedAt: '2026-09-14T10:00:00Z',
        },
      ];

      const result = await generateCompanyLedgerPDF(
        comp1,
        invoices,
        payments,
        'Business Ledger',
        '2026-09-10',
        '2026-09-15'
      );

      expect(result.filename).toBe('CompanyLedger_Login_Smart_Technology_10-09-2026_to_15-09-2026.pdf');
      expect(result.pdfBlob.size).toBeGreaterThan(1000);

      const pdfText = await result.pdfBlob.text();
      expect(pdfText).toContain('Opening Balance');
      expect(pdfText).toContain('Closing Balance');
      expect(pdfText).toContain('Login Smart Technology');
      expect(pdfText).toContain('10-09-2026 to 15-09-2026');
    });

    it('validates backup payload with companies and companyInvoices and provides backward compatibility for older backups', async () => {
      const { validateBackupPayload } = await import('../src/services/backup');

      // Valid new payload
      const modernPayload = {
        version: 3,
        appVersion: '1.2',
        exportedAt: '2026-09-24T12:00:00.000Z',
        parties: [],
        invoices: [],
        partyPayments: [],
        companyPayments: [],
        companies: [{ id: 'comp-1', name: 'Login Smart Technology', createdAt: '', updatedAt: '' }],
        companyInvoices: [{ id: 'ci-1', companyId: 'comp-1', invoiceNumber: '1', date: '2026-09-24', amount: 1000, createdAt: '', updatedAt: '' }],
        dailyReconciliations: [],
      };
      const validModern = validateBackupPayload(modernPayload);
      expect(validModern.valid).toBe(true);
      expect(validModern.normalized?.companies).toHaveLength(1);
      expect(validModern.normalized?.companyInvoices).toHaveLength(1);

      // Older version 2 backup without companies and companyInvoices
      const legacyPayload = {
        version: 2,
        appVersion: '1.1',
        exportedAt: '2026-09-23T12:00:00.000Z',
        parties: [],
        invoices: [],
        partyPayments: [],
        companyPayments: [],
        dailyReconciliations: [],
      };
      const validLegacy = validateBackupPayload(legacyPayload);
      expect(validLegacy.valid).toBe(true);
      // Automatically defaults missing tables to empty arrays so old backups restore seamlessly
      expect(validLegacy.normalized?.companies).toEqual([]);
      expect(validLegacy.normalized?.companyInvoices).toEqual([]);
    });

    it('formats all dates strictly in DD-MM-YYYY standard with 2-digit padding', async () => {
      const { formatDateDisplay, formatDate } = await import('../src/services/accounting');

      // Standard YYYY-MM-DD
      expect(formatDateDisplay('2026-09-24')).toBe('24-09-2026');
      expect(formatDateDisplay('2027-01-05')).toBe('05-01-2027');
      expect(formatDateDisplay('2026-12-31')).toBe('31-12-2026');

      // Single-digit month/day with padding
      expect(formatDateDisplay('2026-9-5')).toBe('05-09-2026');
      expect(formatDateDisplay('2026-09-5')).toBe('05-09-2026');
      expect(formatDateDisplay('2026-9-05')).toBe('05-09-2026');

      // ISO Timestamp strings
      expect(formatDateDisplay('2026-09-24T10:30:00.000Z')).toBe('24-09-2026');
      expect(formatDateDisplay('2027-01-05T00:00:00Z')).toBe('05-01-2027');

      // Slash formatted dates converted to hyphens
      expect(formatDateDisplay('24/09/2026')).toBe('24-09-2026');
      expect(formatDateDisplay('5/1/2027')).toBe('05-01-2027');

      // Date objects
      const d = new Date(2026, 8, 24); // Sep 24, 2026
      expect(formatDateDisplay(d)).toBe('24-09-2026');

      // formatDate alias behaves identically
      expect(formatDate('2026-09-24')).toBe('24-09-2026');
      expect(formatDate('2027-01-05')).toBe('05-01-2027');

      // parseToYYYYMMDD converts any input format back to standard YYYY-MM-DD
      expect(parseToYYYYMMDD('24-09-2026')).toBe('2026-09-24');
      expect(parseToYYYYMMDD('05-01-2027')).toBe('2027-01-05');
      expect(parseToYYYYMMDD('24/09/2026')).toBe('2026-09-24');
      expect(parseToYYYYMMDD('2026-09-24')).toBe('2026-09-24');
    });

    it('implements connected Party ↔ Company single master record accounting without duplicate transactions', async () => {
      // 1. Setup Companies and Parties
      const compA: Company = { id: 'comp-A', name: 'Company A', createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z' };
      const compB: Company = { id: 'comp-B', name: 'Company B', createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z' };
      const partyA: Party = { id: 'party-A', name: 'Party A', phone: '03001234567', createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z' };
      const partyB: Party = { id: 'party-B', name: 'Party B', phone: '03007654321', createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z' };

      // Single master list of invoices and payments (as in Dexie db.invoices, db.partyPayments, db.companyPayments)
      const allInvoices: PartyInvoice[] = [];
      const allPayments: PartyPayment[] = [];
      const companyPayments: CompanyPayment[] = [];

      // 2. Step 1: Create Invoice 1: Company A, Party A, INV-001, Rs 50,000
      const inv1: PartyInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        partyId: partyA.id,
        partyName: partyA.name,
        companyId: compA.id,
        companyName: compA.name,
        date: '2026-09-24',
        amount: 50000,
        createdAt: '2026-09-24T10:30:00Z',
        updatedAt: '2026-09-24T10:30:00Z',
      };
      allInvoices.push(inv1);

      // Verify Party A Ledger
      const partyATimeline1 = getPartyLedgerTimeline(partyA.id, allInvoices, allPayments);
      expect(partyATimeline1.entries).toHaveLength(1);
      expect(partyATimeline1.entries[0].invoiceNumber).toBe('INV-001');
      expect(partyATimeline1.entries[0].companyName).toBe('Company A');
      expect(partyATimeline1.finalBalance).toBe(50000);

      // Verify Company A Ledger
      const compATimeline1 = getCompanyLedgerTimeline(compA.id, allInvoices, companyPayments);
      expect(compATimeline1.entries).toHaveLength(1);
      expect(compATimeline1.entries[0].partyName).toBe('Party A');
      expect(compATimeline1.entries[0].invoiceNumber).toBe('INV-001');
      expect(compATimeline1.finalBalance).toBe(50000);

      // 3. Step 2: Record Party Payment: Party A, Rs 10,000 Cash
      const pmt1: PartyPayment = {
        id: 'pmt-1',
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-25',
        amount: 10000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-25T11:00:00Z',
        updatedAt: '2026-09-25T11:00:00Z',
      };
      allPayments.push(pmt1);

      // Verify Party A Ledger Balance reduces: 50,000 - 10,000 = 40,000
      const partyABalance2 = calculatePartyBalance(partyA.id, allInvoices, allPayments);
      expect(partyABalance2.currentBalance).toBe(40000);

      // Verify Company A Ledger Balance remains UNCHANGED at 50,000 (Party payment does not affect Company!)
      const compABalance2 = calculateSingleCompanyBalance(compA.id, allInvoices, companyPayments);
      expect(compABalance2.currentBalance).toBe(50000);

      // Step 2b: Record Company Payment to Company A: Rs 10,000 Bank
      const cpmt1: CompanyPayment = {
        id: 'cpmt-1',
        companyId: compA.id,
        companyName: compA.name,
        date: '2026-09-25',
        amount: 10000,
        paymentMethod: 'Bank',
        reference: 'DEP-101',
        createdAt: '2026-09-25T11:30:00Z',
        updatedAt: '2026-09-25T11:30:00Z',
      };
      companyPayments.push(cpmt1);

      // Verify Company A balance reduces: 50,000 - 10,000 = 40,000
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, companyPayments).currentBalance).toBe(40000);
      // Verify Party A balance remains 40,000 (Company payment does not affect Party!)
      expect(calculatePartyBalance(partyA.id, allInvoices, allPayments).currentBalance).toBe(40000);

      // 4. Step 3: Create Invoice 2: Company B, Party A, INV-002, Rs 30,000
      const inv2: PartyInvoice = {
        id: 'inv-2',
        invoiceNumber: 'INV-002',
        partyId: partyA.id,
        partyName: partyA.name,
        companyId: compB.id,
        companyName: compB.name,
        date: '2026-09-26',
        amount: 30000,
        createdAt: '2026-09-26T10:00:00Z',
        updatedAt: '2026-09-26T10:00:00Z',
      };
      allInvoices.push(inv2);

      // Party A Ledger contains invoices from BOTH companies
      const partyATimeline3 = getPartyLedgerTimeline(partyA.id, allInvoices, allPayments);
      expect(partyATimeline3.entries).toHaveLength(3); // INV-001 (Comp A), Payment, INV-002 (Comp B)
      expect(partyATimeline3.entries[0].companyName).toBe('Company A');
      expect(partyATimeline3.entries[2].companyName).toBe('Company B');
      expect(calculatePartyBalance(partyA.id, allInvoices, allPayments).currentBalance).toBe(70000);

      // Company A Ledger ONLY contains Company A transactions
      const compATimeline3 = getCompanyLedgerTimeline(compA.id, allInvoices, companyPayments);
      expect(compATimeline3.entries).toHaveLength(2); // inv1, cpmt1
      expect(compATimeline3.finalBalance).toBe(40000);

      // Company B Ledger ONLY contains Company B transactions
      const compBTimeline3 = getCompanyLedgerTimeline(compB.id, allInvoices, companyPayments);
      expect(compBTimeline3.entries).toHaveLength(1);
      expect(compBTimeline3.entries[0].invoiceNumber).toBe('INV-002');
      expect(compBTimeline3.finalBalance).toBe(30000);

      // 5. Step 4: Add Payment to Company B: Rs 10,000
      const cpmt2: CompanyPayment = {
        id: 'cpmt-2',
        companyId: compB.id,
        companyName: compB.name,
        date: '2026-09-27',
        amount: 10000,
        paymentMethod: 'Bank',
        createdAt: '2026-09-27T12:00:00Z',
        updatedAt: '2026-09-27T12:00:00Z',
      };
      companyPayments.push(cpmt2);

      // Company B balance changes: 30,000 - 10,000 = 20,000
      expect(calculateSingleCompanyBalance(compB.id, allInvoices, companyPayments).currentBalance).toBe(20000);

      // Company A balance does NOT change: remains 40,000
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, companyPayments).currentBalance).toBe(40000);

      // Party A balance does NOT change: remains 70,000
      expect(calculatePartyBalance(partyA.id, allInvoices, allPayments).currentBalance).toBe(70000);

      // 6. Verify master records
      expect(allInvoices).toHaveLength(2);
      expect(allPayments).toHaveLength(1);
      expect(companyPayments).toHaveLength(2);
    });
  });

  describe('Company-wise Invoice Number Uniqueness & Regression Verification', () => {
    const compA: Company = {
      id: 'comp-a',
      name: 'Company A',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };
    const compB: Company = {
      id: 'comp-b',
      name: 'Company B',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };
    const partyA: Party = {
      id: 'party-a',
      name: 'Party A',
      phone: '03001234567',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };
    const partyB: Party = {
      id: 'party-b',
      name: 'Party B',
      phone: '03217654321',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    it('validates all 11 exact regression cases according to company-scoped rules', () => {
      const invoices: PartyInvoice[] = [];

      // Case 1: Company A -> Invoice #1 -> Party A -> Save -> SUCCESS
      const check1 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '1',
        companyId: compA.id,
        companyName: compA.name,
      });
      expect(check1.isDuplicate).toBe(false);
      invoices.push({
        id: 'inv-a-1',
        invoiceNumber: '1',
        companyId: compA.id,
        companyName: compA.name,
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-25',
        amount: 10000,
        createdAt: '2026-09-25T10:00:00Z',
        updatedAt: '2026-09-25T10:00:00Z',
      });

      // Case 2: Company B -> Invoice #1 -> Party A -> Save -> SUCCESS (Different company same invoice number)
      const check2 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '1',
        companyId: compB.id,
        companyName: compB.name,
      });
      expect(check2.isDuplicate).toBe(false);
      invoices.push({
        id: 'inv-b-1',
        invoiceNumber: '1',
        companyId: compB.id,
        companyName: compB.name,
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-25',
        amount: 15000,
        createdAt: '2026-09-25T10:05:00Z',
        updatedAt: '2026-09-25T10:05:00Z',
      });

      // Case 3: Company A -> Invoice #5 -> Party B -> Save -> SUCCESS
      const check3 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '5',
        companyId: compA.id,
        companyName: compA.name,
      });
      expect(check3.isDuplicate).toBe(false);
      invoices.push({
        id: 'inv-a-5',
        invoiceNumber: '5',
        companyId: compA.id,
        companyName: compA.name,
        partyId: partyB.id,
        partyName: partyB.name,
        date: '2026-09-25',
        amount: 25000,
        createdAt: '2026-09-25T10:10:00Z',
        updatedAt: '2026-09-25T10:10:00Z',
      });

      // Case 4: Company B -> Invoice #5 -> Party B -> Save -> SUCCESS
      const check4 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '5',
        companyId: compB.id,
        companyName: compB.name,
      });
      expect(check4.isDuplicate).toBe(false);
      invoices.push({
        id: 'inv-b-5',
        invoiceNumber: '5',
        companyId: compB.id,
        companyName: compB.name,
        partyId: partyB.id,
        partyName: partyB.name,
        date: '2026-09-25',
        amount: 35000,
        createdAt: '2026-09-25T10:15:00Z',
        updatedAt: '2026-09-25T10:15:00Z',
      });

      // Case 5: Company A -> Invoice #5 again -> BLOCK with duplicate warning
      const check5 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '5',
        companyId: compA.id,
        companyName: compA.name,
      });
      expect(check5.isDuplicate).toBe(true);
      expect(check5.message).toContain('Invoice #5 already exists for Company A');

      // Also verify spacing / case normalization blocks duplicates (e.g. ' 5 ')
      const check5Normalized = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: ' 5 ',
        companyId: compA.id,
        companyName: compA.name,
      });
      expect(check5Normalized.isDuplicate).toBe(true);

      // Case 6: Edit existing Company A Invoice #5 -> should remain allowed (currentInvoiceId excluded)
      const check6 = checkCompanyInvoiceUniqueness(invoices, {
        invoiceNumber: '5',
        companyId: compA.id,
        companyName: compA.name,
        currentInvoiceId: 'inv-a-5',
      });
      expect(check6.isDuplicate).toBe(false);

      // Case 7, 8 & 9: Party search and selection verification
      const partyList: Party[] = [
        { id: 'p-1', name: 'Muhammad Ali', phone: '03001111111', createdAt: '', updatedAt: '' },
        { id: 'p-2', name: 'Muhammad Usman', phone: '03002222222', createdAt: '', updatedAt: '' },
        { id: 'p-3', name: 'Munir Ahmed', phone: '03003333333', createdAt: '', updatedAt: '' },
      ];

      const searchMu = partyList.filter((p) =>
        p.name.toLowerCase().includes('mu') || (p.phone && p.phone.includes('mu'))
      );
      expect(searchMu).toHaveLength(3); // Muhammad Ali, Muhammad Usman, Munir Ahmed (all contain 'mu' / 'Mu')

      const searchMuh = partyList.filter((p) =>
        p.name.toLowerCase().includes('muh') || (p.phone && p.phone.includes('muh'))
      );
      expect(searchMuh).toHaveLength(2); // Muhammad Ali, Muhammad Usman

      const searchMuhammad = partyList.filter((p) =>
        p.name.toLowerCase().includes('muhammad') || (p.phone && p.phone.includes('muhammad'))
      );
      expect(searchMuhammad).toHaveLength(2);
      expect(searchMuhammad.find((p) => p.name === 'Muhammad Usman')?.id).toBe('p-2');

      // Case 10: Company A ledger does NOT contain Company B invoice/payment
      const compALedger = getCompanyLedgerTimeline(compA.id, invoices, []);
      expect(compALedger.entries).toHaveLength(2); // #1 (10,000) + #5 (25,000)
      expect(compALedger.finalBalance).toBe(35000);
      expect(compALedger.entries.every((e) => e.companyId === compA.id)).toBe(true);

      const compBLedger = getCompanyLedgerTimeline(compB.id, invoices, []);
      expect(compBLedger.entries).toHaveLength(2); // #1 (15,000) + #5 (35,000)
      expect(compBLedger.finalBalance).toBe(50000);
      expect(compBLedger.entries.every((e) => e.companyId === compB.id)).toBe(true);

      // Case 11: Party A ledger shows transactions from multiple companies with correct company badges
      const partyALedger = getPartyLedgerTimeline(partyA.id, invoices, []);
      expect(partyALedger.entries).toHaveLength(2);
      expect(partyALedger.entries[0].companyName).toBe('Company A');
      expect(partyALedger.entries[0].invoiceNumber).toBe('1');
      expect(partyALedger.entries[1].companyName).toBe('Company B');
      expect(partyALedger.entries[1].invoiceNumber).toBe('1');
      expect(partyALedger.finalBalance).toBe(25000); // 10,000 + 15,000
    });

    it('verifies that both Party and Company have complete Dual View functionality (View Ledger + Transactions)', () => {
      // 1. Setup multi-company and multi-party test transactions
      const comp1: Company = { id: 'c-1', name: 'Alpha Traders', createdAt: '', updatedAt: '' };
      const comp2: Company = { id: 'c-2', name: 'Beta Suppliers', createdAt: '', updatedAt: '' };
      const party1: Party = { id: 'p-1', name: 'Customer One', createdAt: '', updatedAt: '' };
      const party2: Party = { id: 'p-2', name: 'Customer Two', createdAt: '', updatedAt: '' };

      const allInvoices: PartyInvoice[] = [
        {
          id: 'inv-1',
          invoiceNumber: '101',
          companyId: comp1.id,
          companyName: comp1.name,
          partyId: party1.id,
          partyName: party1.name,
          date: '2026-09-25',
          amount: 40000,
          createdAt: '2026-09-25T10:00:00Z',
          updatedAt: '2026-09-25T10:00:00Z',
        },
        {
          id: 'inv-2',
          invoiceNumber: '102',
          companyId: comp2.id,
          companyName: comp2.name,
          partyId: party1.id,
          partyName: party1.name,
          date: '2026-09-26',
          amount: 60000,
          createdAt: '2026-09-26T10:00:00Z',
          updatedAt: '2026-09-26T10:00:00Z',
        },
        {
          id: 'inv-3',
          invoiceNumber: '101', // Same number for different company
          companyId: comp2.id,
          companyName: comp2.name,
          partyId: party2.id,
          partyName: party2.name,
          date: '2026-09-26',
          amount: 30000,
          createdAt: '2026-09-26T11:00:00Z',
          updatedAt: '2026-09-26T11:00:00Z',
        },
      ];

      const allPayments: PartyPayment[] = [
        {
          id: 'pmt-1',
          companyId: comp1.id,
          companyName: comp1.name,
          partyId: party1.id,
          partyName: party1.name,
          date: '2026-09-25',
          amount: 15000,
          paymentMethod: 'Cash',
          createdAt: '2026-09-25T12:00:00Z',
          updatedAt: '2026-09-25T12:00:00Z',
        },
        {
          id: 'pmt-2',
          companyId: comp2.id,
          companyName: comp2.name,
          partyId: party1.id,
          partyName: party1.name,
          date: '2026-09-27',
          amount: 20000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-27T12:00:00Z',
          updatedAt: '2026-09-27T12:00:00Z',
        },
      ];

      // --- PARTY 1 VERIFICATION ---
      // A. Party 1 View Ledger (Chronological running balance)
      const party1Timeline = getPartyLedgerTimeline(party1.id, allInvoices, allPayments);
      expect(party1Timeline.entries).toHaveLength(4); // inv-1, pmt-1, inv-2, pmt-2
      expect(party1Timeline.totalDebit).toBe(100000); // 40k + 60k
      expect(party1Timeline.totalCredit).toBe(35000); // 15k + 20k
      expect(party1Timeline.finalBalance).toBe(65000);
      // Invoices show multiple companies, party payments have no company association
      expect(party1Timeline.entries.filter((e) => e.type === 'invoice').map((e) => e.companyName)).toEqual([
        'Alpha Traders',
        'Beta Suppliers',
      ]);

      // B. Party 1 Transactions (Invoices list & Payments list)
      const party1Invoices = allInvoices.filter((i) => i.partyId === party1.id);
      const party1Payments = allPayments.filter((p) => p.partyId === party1.id);
      expect(party1Invoices).toHaveLength(2);
      expect(party1Payments).toHaveLength(2);

      // --- COMPANY 2 (Beta Suppliers) VERIFICATION ---
      const comp2CompanyPayments: CompanyPayment[] = [
        {
          id: 'cp-1',
          companyId: comp2.id,
          companyName: comp2.name,
          date: '2026-09-27',
          amount: 20000,
          paymentMethod: 'Bank',
          createdAt: '2026-09-27T12:00:00Z',
          updatedAt: '2026-09-27T12:00:00Z',
        },
      ];

      // A. Company 2 View Ledger (Chronological running balance)
      const comp2Timeline = getCompanyLedgerTimeline(comp2.id, allInvoices, comp2CompanyPayments);
      expect(comp2Timeline.entries).toHaveLength(3); // inv-2 (p1), inv-3 (p2), cp-1
      expect(comp2Timeline.totalDebit).toBe(90000); // 60k + 30k
      expect(comp2Timeline.totalCredit).toBe(20000); // 20k
      expect(comp2Timeline.finalBalance).toBe(70000);
      expect(comp2Timeline.entries.filter((e) => e.type === 'invoice').map((e) => e.partyName)).toEqual([
        'Customer One',
        'Customer Two',
      ]);

      // B. Company 2 Transactions (Invoices list & Payments list)
      const comp2Invoices = allInvoices.filter((i) => i.companyId === comp2.id);
      const comp2Payments = comp2CompanyPayments.filter((p) => p.companyId === comp2.id);
      expect(comp2Invoices).toHaveLength(2);
      expect(comp2Payments).toHaveLength(1);

      // Verify no duplicate master records
      expect(allInvoices).toHaveLength(3);
      expect(allPayments).toHaveLength(2);
      expect(comp2CompanyPayments).toHaveLength(1);
    });
  });

  describe('Historical Backup Restoration & Accounting Integrity', () => {
    it('accurately validates, normalizes, and computes accounting balances for SmartTech_Ledger_Backup_2026-09-26 payload', () => {
      // 11 parties
      const parties: Party[] = [
        { id: '1790360890551-3msdemk', name: 'Khawaja Mobiles', phone: '03030230751', address: 'Kachery Bazar', createdAt: '2026-09-25T18:28:10.539Z', updatedAt: '2026-09-25T18:28:10.539Z' },
        { id: '1790360916070-8247d5a', name: 'Musa Mobiles', phone: '03247324677', address: 'Kachery Bazar', createdAt: '2026-09-25T18:28:36.070Z', updatedAt: '2026-09-25T18:28:36.070Z' },
        { id: '1790360959089-eujo0si', name: 'Oppo Outlet', phone: '03276029889', address: 'Kachery Bazar', createdAt: '2026-09-25T18:29:19.089Z', updatedAt: '2026-09-25T18:29:19.089Z' },
        { id: '1790360996764-o5huoz7', name: 'Kausar Mobiles', phone: '03117975509', address: 'Kachery Bazar', createdAt: '2026-09-25T18:29:56.764Z', updatedAt: '2026-09-25T18:29:56.764Z' },
        { id: '1790361026340-a3b92n7', name: 'Goray Mobiles', phone: '03117975509', address: 'Kachery Bazar', createdAt: '2026-09-25T18:30:26.340Z', updatedAt: '2026-09-25T18:30:26.340Z' },
        { id: '1790361055730-8s42qkx', name: 'Asif Watch&Mobiles', phone: '03117975509', address: 'Kachery Bazar', createdAt: '2026-09-25T18:30:55.730Z', updatedAt: '2026-09-25T18:30:55.730Z' },
        { id: '1790361086282-vxc8lc4', name: 'Ali Smart Mobiles', phone: '03467868685', address: 'Kachery Bazar', createdAt: '2026-09-25T18:31:26.281Z', updatedAt: '2026-09-25T18:31:46.417Z' },
        { id: '1790361137869-zw36cm9', name: 'Amir Mobiles', phone: '03006652886', address: 'Kachery Bazar', createdAt: '2026-09-25T18:32:17.869Z', updatedAt: '2026-09-25T18:32:17.869Z' },
        { id: '1790361171465-9d2i9n3', name: 'I.Phone', phone: '03132356635', address: 'Kachery Bazar', createdAt: '2026-09-25T18:32:51.465Z', updatedAt: '2026-09-25T18:32:51.465Z' },
        { id: '1790361195828-x5e8emt', name: 'Talha Mobiles', phone: '034023311964', address: 'Kachery Bazar', createdAt: '2026-09-25T18:33:15.828Z', updatedAt: '2026-09-25T18:33:15.828Z' },
        { id: '1790361222215-lrzhtug', name: 'Mobile Link', phone: '03260666239', address: 'Kachery Bazar', createdAt: '2026-09-25T18:33:42.215Z', updatedAt: '2026-09-25T18:33:42.215Z' },
      ];

      // 1 Company
      const company: Company = {
        id: '1790253569936-6kbaahl',
        name: 'Hassan Traders Login',
        phone: '03230079023',
        address: 'G-Ground HariyanWala Chock',
        createdAt: '2026-09-24T12:39:29.936Z',
        updatedAt: '2026-09-25T18:54:47.170Z',
      };

      // 11 Invoices totaling 216,210
      const rawInvoices: PartyInvoice[] = [
        { id: '1790361268476-mi794bz', invoiceNumber: '5627', partyId: '1790360890551-3msdemk', partyName: 'Khawaja Mobiles', date: '2026-09-20', amount: 8210, createdAt: '2026-09-25T18:34:28.476Z', updatedAt: '2026-09-25T18:34:28.476Z' },
        { id: '1790361347199-9e8gz21', invoiceNumber: '5632', partyId: '1790360916070-8247d5a', partyName: 'Musa Mobiles', date: '2026-09-20', amount: 30430, createdAt: '2026-09-25T18:35:47.199Z', updatedAt: '2026-09-25T18:35:47.199Z' },
        { id: '1790361434542-7rgirv6', invoiceNumber: '5633', partyId: '1790360959089-eujo0si', partyName: 'Oppo Outlet', date: '2026-09-20', amount: 14550, createdAt: '2026-09-25T18:37:14.542Z', updatedAt: '2026-09-25T18:37:14.542Z' },
        { id: '1790361528655-goss1nh', invoiceNumber: '5637', partyId: '1790360996764-o5huoz7', partyName: 'Kausar Mobiles', date: '2026-09-20', amount: 22050, createdAt: '2026-09-25T18:38:48.655Z', updatedAt: '2026-09-25T18:38:48.655Z' },
        { id: '1790361581951-djluhha', invoiceNumber: '5638', partyId: '1790361026340-a3b92n7', partyName: 'Goray Mobiles', date: '2026-09-20', amount: 28700, createdAt: '2026-09-25T18:39:41.951Z', updatedAt: '2026-09-25T18:39:41.951Z' },
        { id: '1790361633024-miue59n', invoiceNumber: '5639', partyId: '1790361055730-8s42qkx', partyName: 'Asif Watch&Mobiles', date: '2026-09-20', amount: 24100, createdAt: '2026-09-25T18:40:33.024Z', updatedAt: '2026-09-25T18:40:33.024Z' },
        { id: '1790361677601-tpti4zl', invoiceNumber: '5628', partyId: '1790361086282-vxc8lc4', partyName: 'Ali Smart Mobiles', date: '2026-09-20', amount: 19950, createdAt: '2026-09-25T18:41:17.600Z', updatedAt: '2026-09-25T18:41:17.600Z' },
        { id: '1790361738108-g3trnjn', invoiceNumber: '5629', partyId: '1790361137869-zw36cm9', partyName: 'Amir Mobiles', date: '2026-09-20', amount: 23260, createdAt: '2026-09-25T18:42:18.108Z', updatedAt: '2026-09-25T18:42:18.108Z' },
        { id: '1790361787859-8pqe4pt', invoiceNumber: '5630', partyId: '1790361171465-9d2i9n3', partyName: 'I.Phone', date: '2026-09-20', amount: 23160, createdAt: '2026-09-25T18:43:07.859Z', updatedAt: '2026-09-25T18:43:07.859Z' },
        { id: '1790361820148-bjj0gwp', invoiceNumber: '5631', partyId: '1790361195828-x5e8emt', partyName: 'Talha Mobiles', date: '2026-09-20', amount: 11100, createdAt: '2026-09-25T18:43:40.148Z', updatedAt: '2026-09-25T18:43:40.148Z' },
        { id: '1790361859221-mcq90mi', invoiceNumber: '5664', partyId: '1790361222215-lrzhtug', partyName: 'Mobile Link', date: '2026-09-23', amount: 10700, createdAt: '2026-09-25T18:44:19.221Z', updatedAt: '2026-09-25T18:44:19.221Z' },
      ];

      // 4 Company payments totaling 44,000
      const companyPayments: CompanyPayment[] = [
        { id: '1790363069055-c9591h6', companyId: company.id, companyName: company.name, date: '2026-09-22', amount: 30500, paymentMethod: 'Cash', createdAt: '2026-09-25T19:04:29.055Z', updatedAt: '2026-09-25T19:04:29.055Z' },
        { id: '1790363080928-wbo5of6', companyId: company.id, companyName: company.name, date: '2026-09-23', amount: 9500, paymentMethod: 'Cash', createdAt: '2026-09-25T19:04:40.928Z', updatedAt: '2026-09-25T19:05:12.992Z' },
        { id: '1790363096769-ldkwveh', companyId: company.id, companyName: company.name, date: '2026-09-24', amount: 3000, paymentMethod: 'Cash', createdAt: '2026-09-25T19:04:56.769Z', updatedAt: '2026-09-25T19:04:56.769Z' },
        { id: '1790363142358-7z2a2ru', companyId: company.id, companyName: company.name, date: '2026-09-24', amount: 1000, paymentMethod: 'Easypaisa', createdAt: '2026-09-25T19:05:42.358Z', updatedAt: '2026-09-25T19:05:42.358Z' },
      ];

      // Enriched invoices with company
      const unifiedInvoices: PartyInvoice[] = rawInvoices.map((inv) => ({
        ...inv,
        companyId: company.id,
        companyName: company.name,
      }));

      // 24 Party payments totaling 44,000
      const totalPartyPaymentsSum = 44000;
      const totalInvoicesSum = 216210;
      const expectedReceivable = totalInvoicesSum - totalPartyPaymentsSum; // 172,210
      const expectedPayable = totalInvoicesSum - 44000; // 172,210

      // Calculate Company Balance
      const compBalance = calculateSingleCompanyBalance(company.id, unifiedInvoices, companyPayments);
      expect(compBalance.totalInvoices).toBe(216210);
      expect(compBalance.totalPayments).toBe(44000);
      expect(compBalance.currentBalance).toBe(172210);
      expect(compBalance.isAdvance).toBe(false);

      // Verify Company Ledger Timeline
      const compTimeline = getCompanyLedgerTimeline(company.id, unifiedInvoices, companyPayments);
      expect(compTimeline.entries).toHaveLength(15); // 11 invoices + 4 payments
      expect(compTimeline.totalDebit).toBe(216210);
      expect(compTimeline.totalCredit).toBe(44000);
      expect(compTimeline.finalBalance).toBe(172210);
    });
  });

  describe('Restored Backup Data Verification', () => {
    it('verifies that RESTORED_BACKUP_PAYLOAD contains all real business data with exact balances', async () => {
      const { RESTORED_BACKUP_PAYLOAD } = await import('../src/data/restoredBackupSeed');
      expect(RESTORED_BACKUP_PAYLOAD.parties).toHaveLength(11);
      expect(RESTORED_BACKUP_PAYLOAD.companies).toHaveLength(1);
      expect(RESTORED_BACKUP_PAYLOAD.invoices).toHaveLength(11);
      expect(RESTORED_BACKUP_PAYLOAD.partyPayments).toHaveLength(24);
      expect(RESTORED_BACKUP_PAYLOAD.companyPayments).toHaveLength(4);
      expect(RESTORED_BACKUP_PAYLOAD.companyInvoices).toHaveLength(11);

      // Verify Total Invoices Sum = Rs 216,210
      const totalInvoices = RESTORED_BACKUP_PAYLOAD.invoices.reduce((sum, inv) => sum + inv.amount, 0);
      expect(totalInvoices).toBe(216210);

      // Verify Total Party Payments Sum = Rs 44,000
      const totalPartyPayments = RESTORED_BACKUP_PAYLOAD.partyPayments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPartyPayments).toBe(44000);

      // Net Market Receivable = Rs 172,210
      expect(totalInvoices - totalPartyPayments).toBe(172210);

      // Verify Company Payables
      const totalCompanyInvoices = RESTORED_BACKUP_PAYLOAD.companyInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      expect(totalCompanyInvoices).toBe(216210);

      const totalCompanyPayments = RESTORED_BACKUP_PAYLOAD.companyPayments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalCompanyPayments).toBe(44000);

      // Net Company Payable = Rs 172,210
      expect(totalCompanyInvoices - totalCompanyPayments).toBe(172210);

      // Net Difference = 0
      expect((totalInvoices - totalPartyPayments) - (totalCompanyInvoices - totalCompanyPayments)).toBe(0);

      // Verify bidirectional enrichment on all company invoices
      RESTORED_BACKUP_PAYLOAD.companyInvoices.forEach(inv => {
        expect(inv.partyId).toBeTruthy();
        expect(inv.partyName).toBeTruthy();
      });

      // Verify companyId on all invoices
      const companyId = RESTORED_BACKUP_PAYLOAD.companies[0].id;
      RESTORED_BACKUP_PAYLOAD.invoices.forEach(inv => {
        expect(inv.companyId).toBe(companyId);
        expect(inv.companyName).toBe('Hassan Traders Login');
      });
    });
  });

  describe('Final Payment Relationship Architecture Acceptance Tests', () => {
    it('executes the exact user verification scenario with separated relationships', () => {
      const compA: Company = { id: 'comp-a', name: 'Company A', createdAt: '', updatedAt: '' };
      const partyA: Party = { id: 'party-a', name: 'Party A', createdAt: '', updatedAt: '' };
      const partyB: Party = { id: 'party-b', name: 'Party B', createdAt: '', updatedAt: '' };
      const partyC: Party = { id: 'party-c', name: 'Party C', createdAt: '', updatedAt: '' };

      const allInvoices: PartyInvoice[] = [];
      const allPartyPayments: PartyPayment[] = [];
      const allCompanyPayments: CompanyPayment[] = [];

      // 1. Create Company A + Party A invoice: Company A + Party A = Rs.1,000
      allInvoices.push({
        id: 'inv-100',
        invoiceNumber: '100',
        companyId: compA.id,
        companyName: compA.name,
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-26',
        amount: 1000,
        createdAt: '2026-09-26T10:00:00Z',
        updatedAt: '2026-09-26T10:00:00Z',
      });

      // Verify invoice has BOTH relationships
      expect(allInvoices[0].companyId).toBe('comp-a');
      expect(allInvoices[0].partyId).toBe('party-a');
      expect(calculatePartyBalance(partyA.id, allInvoices, allPartyPayments).currentBalance).toBe(1000);
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, allCompanyPayments).currentBalance).toBe(1000);

      // 2. Record Party A payment: Party A Payment = Rs.100
      allPartyPayments.push({
        id: 'pmt-a',
        partyId: partyA.id,
        partyName: partyA.name,
        date: '2026-09-26',
        amount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-09-26T11:00:00Z',
        updatedAt: '2026-09-26T11:00:00Z',
      });

      // Expected: Party A remaining balance = Rs.900, Company A remaining balance = Rs.1,000
      expect(calculatePartyBalance(partyA.id, allInvoices, allPartyPayments).currentBalance).toBe(900);
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, allCompanyPayments).currentBalance).toBe(1000);

      // 3. Record Party B payment: Party B Payment = Rs.100
      allPartyPayments.push({
        id: 'pmt-b',
        partyId: partyB.id,
        partyName: partyB.name,
        date: '2026-09-26',
        amount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-09-26T12:00:00Z',
        updatedAt: '2026-09-26T12:00:00Z',
      });

      // Expected: Party B balance changes according to its own transactions, Company A balance remains unchanged
      expect(calculatePartyBalance(partyB.id, allInvoices, allPartyPayments).isAdvance).toBe(true);
      expect(calculatePartyBalance(partyB.id, allInvoices, allPartyPayments).advanceAmount).toBe(100);
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, allCompanyPayments).currentBalance).toBe(1000);

      // 4. Record Party C payment: Party C Payment = Rs.100
      allPartyPayments.push({
        id: 'pmt-c',
        partyId: partyC.id,
        partyName: partyC.name,
        date: '2026-09-26',
        amount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-09-26T13:00:00Z',
        updatedAt: '2026-09-26T13:00:00Z',
      });

      // Expected: Party C balance changes according to its own transactions, Company A balance remains unchanged
      expect(calculatePartyBalance(partyC.id, allInvoices, allPartyPayments).isAdvance).toBe(true);
      expect(calculatePartyBalance(partyC.id, allInvoices, allPartyPayments).advanceAmount).toBe(100);
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, allCompanyPayments).currentBalance).toBe(1000);

      // 5. Manually record: Company A Payment = Rs.300
      allCompanyPayments.push({
        id: 'cpmt-a',
        companyId: compA.id,
        companyName: compA.name,
        date: '2026-09-26',
        amount: 300,
        paymentMethod: 'Bank',
        reference: 'REC-300',
        createdAt: '2026-09-26T14:00:00Z',
        updatedAt: '2026-09-26T14:00:00Z',
      });

      // Expected: Company A remaining balance = Rs.700, No Party balance changes, No Party Payment records are created or modified
      expect(calculateSingleCompanyBalance(compA.id, allInvoices, allCompanyPayments).currentBalance).toBe(700);
      expect(calculatePartyBalance(partyA.id, allInvoices, allPartyPayments).currentBalance).toBe(900);
      expect(calculatePartyBalance(partyB.id, allInvoices, allPartyPayments).advanceAmount).toBe(100);
      expect(calculatePartyBalance(partyC.id, allInvoices, allPartyPayments).advanceAmount).toBe(100);
      expect(allPartyPayments).toHaveLength(3); // Exactly the 3 party payments recorded, untouched
    });

    it('verifies multiple companies per party with separated payments architecture', () => {
      const partyX: Party = { id: 'px', name: 'Super Customer', createdAt: '', updatedAt: '' };
      const comp1: Company = { id: 'c1', name: 'Supplier Alpha', createdAt: '', updatedAt: '' };
      const comp2: Company = { id: 'c2', name: 'Supplier Beta', createdAt: '', updatedAt: '' };

      const invoices: PartyInvoice[] = [
        { id: 'i1', invoiceNumber: '1', companyId: comp1.id, companyName: comp1.name, partyId: partyX.id, partyName: partyX.name, date: '2026-09-01', amount: 5000, createdAt: '', updatedAt: '' },
        { id: 'i2', invoiceNumber: '2', companyId: comp2.id, companyName: comp2.name, partyId: partyX.id, partyName: partyX.name, date: '2026-09-02', amount: 8000, createdAt: '', updatedAt: '' },
      ];

      // Party total liability = 5000 + 8000 = 13,000
      expect(calculatePartyBalance(partyX.id, invoices, []).currentBalance).toBe(13000);
      // Company 1 liability = 5,000
      expect(calculateSingleCompanyBalance(comp1.id, invoices, []).currentBalance).toBe(5000);
      // Company 2 liability = 8,000
      expect(calculateSingleCompanyBalance(comp2.id, invoices, []).currentBalance).toBe(8000);

      // Party makes a general payment of 4,000
      const partyPayments: PartyPayment[] = [
        { id: 'p1', partyId: partyX.id, partyName: partyX.name, date: '2026-09-05', amount: 4000, paymentMethod: 'Cash', createdAt: '', updatedAt: '' },
      ];

      // Party balance is now 9,000
      expect(calculatePartyBalance(partyX.id, invoices, partyPayments).currentBalance).toBe(9000);
      // Companies are completely unaffected by party payment
      expect(calculateSingleCompanyBalance(comp1.id, invoices, []).currentBalance).toBe(5000);
      expect(calculateSingleCompanyBalance(comp2.id, invoices, []).currentBalance).toBe(8000);

      // Business pays Supplier Alpha 2,000 and Supplier Beta 3,000
      const companyPayments: CompanyPayment[] = [
        { id: 'cp1', companyId: comp1.id, companyName: comp1.name, date: '2026-09-06', amount: 2000, paymentMethod: 'Bank', createdAt: '', updatedAt: '' },
        { id: 'cp2', companyId: comp2.id, companyName: comp2.name, date: '2026-09-07', amount: 3000, paymentMethod: 'Bank', createdAt: '', updatedAt: '' },
      ];

      // Supplier Alpha balance is 3,000
      expect(calculateSingleCompanyBalance(comp1.id, invoices, companyPayments).currentBalance).toBe(3000);
      // Supplier Beta balance is 5,000
      expect(calculateSingleCompanyBalance(comp2.id, invoices, companyPayments).currentBalance).toBe(5000);
      // Party balance remains 9,000 (unaffected by company payments)
      expect(calculatePartyBalance(partyX.id, invoices, partyPayments).currentBalance).toBe(9000);
    });
  });

  describe('Automatic Recalculation & Zero/Empty State on Deletion Tests', () => {
    const compA: Company = { id: 'comp-a', name: 'Alpha Traders', createdAt: '', updatedAt: '' };
    const compB: Company = { id: 'comp-b', name: 'Beta Suppliers', createdAt: '', updatedAt: '' };
    const party1: Party = { id: 'party-1', name: 'Party One', phone: '03001234567', createdAt: '', updatedAt: '' };
    const party2: Party = { id: 'party-2', name: 'Party Two', phone: '03007654321', createdAt: '', updatedAt: '' };
    const companies = [compA, compB];
    const parties = [party1, party2];

    it('validates creation, progressive deletion, and zero state for Dashboard and Analytics', () => {
      // 1. Initial State: Empty database
      let invoices: PartyInvoice[] = [];
      let partyPayments: PartyPayment[] = [];
      let companyPayments: CompanyPayment[] = [];

      let analytics0 = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      expect(analytics0.marketReceivable).toBe(0);
      expect(analytics0.marketInvoiced).toBe(0);
      expect(analytics0.marketRecovered).toBe(0);
      expect(analytics0.companyLiability).toBe(0);
      expect(analytics0.companyPaid).toBe(0);
      expect(analytics0.companyOutstanding).toBe(0);
      expect(analytics0.netOutstandingDifference).toBe(0);
      expect(analytics0.invoicesCount).toBe(0);
      expect(analytics0.partyPaymentsCount).toBe(0);
      expect(analytics0.companyPaymentsCount).toBe(0);

      // 2. Step 1: Create transactions
      // Party 1 buys from Comp A: Rs 50,000
      const inv1: PartyInvoice = {
        id: 'inv-1',
        invoiceNumber: '1',
        companyId: compA.id,
        companyName: compA.name,
        partyId: party1.id,
        partyName: party1.name,
        date: '2026-09-26',
        amount: 50000,
        createdAt: '2026-09-26T10:00:00Z',
        updatedAt: '2026-09-26T10:00:00Z',
      };
      // Party 2 buys from Comp B: Rs 30,000
      const inv2: PartyInvoice = {
        id: 'inv-2',
        invoiceNumber: '2',
        companyId: compB.id,
        companyName: compB.name,
        partyId: party2.id,
        partyName: party2.name,
        date: '2026-09-26',
        amount: 30000,
        createdAt: '2026-09-26T10:05:00Z',
        updatedAt: '2026-09-26T10:05:00Z',
      };
      // Party 1 buys from Comp B (Multiple companies per party): Rs 20,000
      const inv3: PartyInvoice = {
        id: 'inv-3',
        invoiceNumber: '3',
        companyId: compB.id,
        companyName: compB.name,
        partyId: party1.id,
        partyName: party1.name,
        date: '2026-09-26',
        amount: 20000,
        createdAt: '2026-09-26T10:10:00Z',
        updatedAt: '2026-09-26T10:10:00Z',
      };

      invoices = [inv1, inv2, inv3];

      // Party 1 pays: Rs 15,000
      const ppmt1: PartyPayment = {
        id: 'ppmt-1',
        partyId: party1.id,
        partyName: party1.name,
        date: '2026-09-26',
        amount: 15000,
        paymentMethod: 'Cash',
        createdAt: '2026-09-26T11:00:00Z',
        updatedAt: '2026-09-26T11:00:00Z',
      };
      partyPayments = [ppmt1];

      // Company A paid: Rs 10,000
      const cpmt1: CompanyPayment = {
        id: 'cpmt-1',
        companyId: compA.id,
        companyName: compA.name,
        date: '2026-09-26',
        amount: 10000,
        paymentMethod: 'Bank',
        createdAt: '2026-09-26T12:00:00Z',
        updatedAt: '2026-09-26T12:00:00Z',
      };
      companyPayments = [cpmt1];

      // Verify Dashboard and Analytics totals with all transactions
      // Total Invoiced = 50,000 + 30,000 + 20,000 = 100,000
      // Party 1 Due = (50,000 + 20,000) - 15,000 = 55,000
      // Party 2 Due = 30,000
      // Total Market Due = 55,000 + 30,000 = 85,000
      // Total Market Recovered = 15,000
      // Comp A Liability = 50,000; Paid = 10,000; Outstanding = 40,000
      // Comp B Liability = 30,000 + 20,000 = 50,000; Paid = 0; Outstanding = 50,000
      // Total Company Liability = 100,000; Total Company Paid = 10,000; Total Company Outstanding = 90,000
      // Net Outstanding Difference = 85,000 - 90,000 = -5,000
      let a1 = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      expect(a1.marketInvoiced).toBe(100000);
      expect(a1.marketReceivable).toBe(85000);
      expect(a1.marketRecovered).toBe(15000);
      expect(a1.companyLiability).toBe(100000);
      expect(a1.companyPaid).toBe(100000 - 90000);
      expect(a1.companyOutstanding).toBe(90000);
      expect(a1.netOutstandingDifference).toBe(-5000);

      // Verify Party and Company individual balances
      expect(calculatePartyBalance(party1.id, invoices, partyPayments).currentBalance).toBe(55000);
      expect(calculatePartyBalance(party2.id, invoices, partyPayments).currentBalance).toBe(30000);
      expect(calculateSingleCompanyBalance(compA.id, invoices, companyPayments).currentBalance).toBe(40000);
      expect(calculateSingleCompanyBalance(compB.id, invoices, companyPayments).currentBalance).toBe(50000);

      // 3. Step 2: Edit a transaction (Edit inv1 from 50,000 to 60,000)
      const editedInv1 = { ...inv1, amount: 60000 };
      invoices = [editedInv1, inv2, inv3];

      let aEdit = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      expect(aEdit.marketInvoiced).toBe(110000);
      expect(aEdit.companyLiability).toBe(110000);
      expect(calculatePartyBalance(party1.id, invoices, partyPayments).currentBalance).toBe(65000);
      expect(calculateSingleCompanyBalance(compA.id, invoices, companyPayments).currentBalance).toBe(50000);

      // 4. Step 3: Delete one transaction (Delete inv3: Rs 20,000 for Party 1 from Comp B)
      invoices = invoices.filter((i) => i.id !== 'inv-3');
      let aDel1 = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      // Market Invoiced: 60,000 + 30,000 = 90,000
      expect(aDel1.marketInvoiced).toBe(90000);
      // Party 1 Due: 60,000 - 15,000 = 45,000
      expect(calculatePartyBalance(party1.id, invoices, partyPayments).currentBalance).toBe(45000);
      // Comp B Liability: only inv2 (30,000) remains
      expect(calculateSingleCompanyBalance(compB.id, invoices, companyPayments).currentBalance).toBe(30000);
      // Comp A Liability: unchanged at 50,000
      expect(calculateSingleCompanyBalance(compA.id, invoices, companyPayments).currentBalance).toBe(50000);
      // Total Company Outstanding: 50,000 + 30,000 = 80,000
      expect(aDel1.companyOutstanding).toBe(80000);

      // 5. Step 4: Delete Party Payment (Delete ppmt1)
      partyPayments = [];
      let aDelPmt = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      // Party 1 Due increases back to 60,000
      expect(calculatePartyBalance(party1.id, invoices, partyPayments).currentBalance).toBe(60000);
      expect(aDelPmt.marketRecovered).toBe(0);
      // Company balances remain strictly unaffected
      expect(calculateSingleCompanyBalance(compA.id, invoices, companyPayments).currentBalance).toBe(50000);
      expect(calculateSingleCompanyBalance(compB.id, invoices, companyPayments).currentBalance).toBe(30000);

      // 6. Step 5: Delete Company Payment (Delete cpmt1)
      companyPayments = [];
      let aDelCompPmt = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      // Comp A Outstanding increases back to 60,000 (liability = 60,000, paid = 0)
      expect(calculateSingleCompanyBalance(compA.id, invoices, companyPayments).currentBalance).toBe(60000);
      expect(aDelCompPmt.companyPaid).toBe(0);
      // Party balances remain strictly unaffected
      expect(calculatePartyBalance(party1.id, invoices, partyPayments).currentBalance).toBe(60000);

      // 7. Step 6: Delete remaining invoices one by one
      invoices = invoices.filter((i) => i.id !== 'inv-2');
      let aDel2 = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);
      expect(aDel2.marketInvoiced).toBe(60000);
      expect(calculatePartyBalance(party2.id, invoices, partyPayments).currentBalance).toBe(0);
      expect(calculateSingleCompanyBalance(compB.id, invoices, companyPayments).currentBalance).toBe(0);

      // Delete the final invoice (inv1)
      invoices = [];
      let aFinal = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all', undefined, undefined, companies);

      // 8. Step 7: Verify complete ZERO/EMPTY state
      expect(aFinal.marketInvoiced).toBe(0);
      expect(aFinal.marketReceivable).toBe(0);
      expect(aFinal.marketRecovered).toBe(0);
      expect(aFinal.companyLiability).toBe(0);
      expect(aFinal.companyPaid).toBe(0);
      expect(aFinal.companyOutstanding).toBe(0);
      expect(aFinal.netOutstandingDifference).toBe(0);
      expect(aFinal.todayRecovery).toBe(0);
      expect(aFinal.todayCompanyPayment).toBe(0);
      expect(aFinal.invoicesCount).toBe(0);
      expect(aFinal.partyPaymentsCount).toBe(0);
      expect(aFinal.companyPaymentsCount).toBe(0);

      // Both parties show 0 balance
      expect(calculatePartyBalance(party1.id, [], []).currentBalance).toBe(0);
      expect(calculatePartyBalance(party2.id, [], []).currentBalance).toBe(0);
      // Both companies show 0 balance
      expect(calculateSingleCompanyBalance(compA.id, [], []).currentBalance).toBe(0);
      expect(calculateSingleCompanyBalance(compB.id, [], []).currentBalance).toBe(0);

      // Recent transactions feed is empty
      expect(getRecentTransactions([], [], [], 15)).toHaveLength(0);
    });
  });
});



