import Dexie, { type Table } from 'dexie';
import type {
  Party,
  PartyInvoice,
  PartyPayment,
  CompanyPayment,
  Company,
  CompanyInvoice,
  AppSettings,
  DailyReconciliation,
} from '../types';

export class SmartTechLedgerDatabase extends Dexie {
  parties!: Table<Party, string>;
  invoices!: Table<PartyInvoice, string>;
  partyPayments!: Table<PartyPayment, string>;
  companyPayments!: Table<CompanyPayment, string>;
  companies!: Table<Company, string>;
  companyInvoices!: Table<CompanyInvoice, string>;
  settings!: Table<AppSettings, string>;
  dailyReconciliations!: Table<DailyReconciliation, string>;

  constructor() {
    super('SmartTechLedgerDB');
    this.version(1).stores({
      parties: 'id, name, phone, createdAt, updatedAt',
      invoices: 'id, invoiceNumber, partyId, partyName, date, createdAt, updatedAt',
      partyPayments: 'id, partyId, partyName, date, paymentMethod, createdAt, updatedAt',
      companyPayments: 'id, date, paymentMethod, reference, createdAt, updatedAt',
      settings: 'id',
    });
    this.version(2).stores({
      dailyReconciliations: 'id, date, updatedAt',
    });
    this.version(3).stores({
      companies: 'id, name, phone, createdAt, updatedAt',
      companyInvoices: 'id, invoiceNumber, companyId, companyName, date, createdAt, updatedAt',
      companyPayments: 'id, companyId, companyName, date, paymentMethod, reference, createdAt, updatedAt',
    }).upgrade(async (tx) => {
      try {
        const payments = await tx.table('companyPayments').toArray();
        const unassigned = payments.filter((p: any) => !p.companyId);
        if (unassigned.length > 0) {
          const defaultCompanyId = 'comp-default-login-smart';
          const now = new Date().toISOString();
          await tx.table('companies').put({
            id: defaultCompanyId,
            name: 'Login Smart Technology',
            createdAt: now,
            updatedAt: now,
          });
          for (const p of unassigned) {
            p.companyId = defaultCompanyId;
            p.companyName = 'Login Smart Technology';
            await tx.table('companyPayments').put(p);
          }
        }
      } catch (err) {
        console.warn('Migration to version 3 upgrade note:', err);
      }
    });
    this.version(4).stores({
      invoices: 'id, invoiceNumber, partyId, partyName, companyId, companyName, date, createdAt, updatedAt',
      partyPayments: 'id, partyId, partyName, companyId, companyName, date, paymentMethod, createdAt, updatedAt',
    });
  }
}

export const db = new SmartTechLedgerDatabase();

// Default settings initialization
export async function initializeSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('default');
  if (existing) {
    return existing;
  }
  const defaultSettings: AppSettings = {
    id: 'default',
    salesmanName: 'Sales Representative',
    companyName: 'Login Smart Technology',
    currencySymbol: 'Rs',
    updatedAt: new Date().toISOString(),
  };
  await db.settings.put(defaultSettings);
  return defaultSettings;
}

// Generate unique ID helper
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Clear all database tables
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.parties,
      db.invoices,
      db.partyPayments,
      db.companyPayments,
      db.dailyReconciliations,
      db.companies,
      db.companyInvoices,
    ],
    async () => {
      await db.parties.clear();
      await db.invoices.clear();
      await db.partyPayments.clear();
      await db.companyPayments.clear();
      await db.dailyReconciliations.clear();
      await db.companies.clear();
      await db.companyInvoices.clear();
    }
  );
}
