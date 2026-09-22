import { describe, it, expect } from 'vitest';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment } from '../src/types';
import {
  calculatePartyBalance,
  calculateCompanyBalance,
  calculateAnalytics,
  formatPKR,
  getPartyLedgerTimeline,
} from '../src/services/accounting';

describe('Smart Technology Ledger - Accounting Engine Tests', () => {
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
        appName: 'Smart Technology',
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

      expect(pdfResult.filename).toBe('Daily_Collection_2026-09-21.pdf');
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
});



