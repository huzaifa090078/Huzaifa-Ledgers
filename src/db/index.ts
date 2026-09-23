import Dexie, { type Table } from 'dexie';
import type {
  Party,
  PartyInvoice,
  PartyPayment,
  CompanyPayment,
  AppSettings,
  DailyReconciliation,
} from '../types';

export class SmartTechLedgerDatabase extends Dexie {
  parties!: Table<Party, string>;
  invoices!: Table<PartyInvoice, string>;
  partyPayments!: Table<PartyPayment, string>;
  companyPayments!: Table<CompanyPayment, string>;
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
    [db.parties, db.invoices, db.partyPayments, db.companyPayments, db.dailyReconciliations],
    async () => {
      await db.parties.clear();
      await db.invoices.clear();
      await db.partyPayments.clear();
      await db.companyPayments.clear();
      await db.dailyReconciliations.clear();
    }
  );
}
