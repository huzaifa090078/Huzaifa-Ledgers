import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db } from '../db';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment, AppSettings, DailyReconciliation } from '../types';
import { getTodayDateString } from './accounting';

export interface BackupDataPayload {
  version: number;
  appName: string;
  exportedAt: string;
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  settings?: AppSettings[];
  dailyReconciliations?: DailyReconciliation[];
}

/**
 * Exports complete application database to a structured JSON file download
 */
export async function exportBackupFile(): Promise<{ filename: string; count: number }> {
  const [parties, invoices, partyPayments, companyPayments, settings, dailyReconciliations] = await Promise.all([
    db.parties.toArray(),
    db.invoices.toArray(),
    db.partyPayments.toArray(),
    db.companyPayments.toArray(),
    db.settings.toArray(),
    db.dailyReconciliations.toArray(),
  ]);

  const payload: BackupDataPayload = {
    version: 1,
    appName: 'Login Smart Technology Business Ledger',
    exportedAt: new Date().toISOString(),
    parties,
    invoices,
    partyPayments,
    companyPayments,
    settings,
    dailyReconciliations,
  };

  const totalCount =
    parties.length + invoices.length + partyPayments.length + companyPayments.length + dailyReconciliations.length;
  const jsonStr = JSON.stringify(payload, null, 2);
  const filename = `SmartTech_Ledger_Backup_${getTodayDateString()}.json`;

  if (Capacitor.isNativePlatform()) {
    // 1. Write the backup JSON file to device filesystem
    let fileUri = '';
    try {
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      fileUri = writeRes.uri;
    } catch {
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      fileUri = writeRes.uri;
    }

    // 2. Open Android native Save / Export sheet to allow saving to Downloads, Drive, File Manager, etc.
    try {
      await Share.share({
        title: filename,
        text: `SmartTech Ledger Backup (${totalCount} records)`,
        url: fileUri,
        dialogTitle: 'Save / Export Backup File',
      });
    } catch (shareErr: any) {
      if (shareErr?.name !== 'AbortError') {
        console.warn('Backup share sheet dismissed or error:', shareErr);
      }
    }

    return { filename, count: totalCount };
  } else {
    // Standard Desktop / Laptop Browser Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { filename, count: totalCount };
  }
}

/**
 * Validates a parsed JSON payload to ensure it is a valid backup file
 */
export function validateBackupPayload(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON file format.' };
  }

  if (!Array.isArray(data.parties)) {
    return { valid: false, error: 'Backup is missing "parties" table.' };
  }
  if (!Array.isArray(data.invoices)) {
    return { valid: false, error: 'Backup is missing "invoices" table.' };
  }
  if (!Array.isArray(data.partyPayments)) {
    return { valid: false, error: 'Backup is missing "partyPayments" table.' };
  }
  if (!Array.isArray(data.companyPayments)) {
    return { valid: false, error: 'Backup is missing "companyPayments" table.' };
  }

  return { valid: true };
}

/**
 * Restores all application tables from an authorized JSON backup payload
 */
export async function restoreBackupData(payload: BackupDataPayload): Promise<{
  partiesCount: number;
  invoicesCount: number;
  partyPaymentsCount: number;
  companyPaymentsCount: number;
}> {
  return await db.transaction(
    'rw',
    [db.parties, db.invoices, db.partyPayments, db.companyPayments, db.settings, db.dailyReconciliations],
    async () => {
      // Clear existing records
      await db.parties.clear();
      await db.invoices.clear();
      await db.partyPayments.clear();
      await db.companyPayments.clear();
      await db.dailyReconciliations.clear();

      // Bulk restore
      if (payload.parties.length > 0) {
        await db.parties.bulkAdd(payload.parties);
      }
      if (payload.invoices.length > 0) {
        await db.invoices.bulkAdd(payload.invoices);
      }
      if (payload.partyPayments.length > 0) {
        await db.partyPayments.bulkAdd(payload.partyPayments);
      }
      if (payload.companyPayments.length > 0) {
        await db.companyPayments.bulkAdd(payload.companyPayments);
      }
      if (payload.settings && payload.settings.length > 0) {
        await db.settings.clear();
        await db.settings.bulkAdd(payload.settings);
      }
      if (payload.dailyReconciliations && payload.dailyReconciliations.length > 0) {
        await db.dailyReconciliations.bulkAdd(payload.dailyReconciliations);
      }

      return {
        partiesCount: payload.parties.length,
        invoicesCount: payload.invoices.length,
        partyPaymentsCount: payload.partyPayments.length,
        companyPaymentsCount: payload.companyPayments.length,
      };
    }
  );
}
