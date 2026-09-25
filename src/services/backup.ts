import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db } from '../db';
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
import { getTodayDateString, formatDateDisplay } from './accounting';

export const FOLDER_SMART_TECH = 'Smart Technology';
export const FOLDER_BACKUP = 'Smart Technology/Backup';
export const FOLDER_DATA = 'Smart Technology/Data';
export const FILE_BACKUP_NAME = 'latest_backup.json';
export const FILE_BACKUP_TEMP = 'latest_backup.tmp';

export interface BackupDataPayload {
  backupFormatVersion: number;
  appVersion: string;
  databaseVersion: number;
  createdAt: string;
  updatedAt: string;
  appName: string;
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  dailyReconciliations: DailyReconciliation[];
  companies?: Company[];
  companyInvoices?: CompanyInvoice[];
  settings?: any;
  data: {
    parties: Party[];
    invoices: PartyInvoice[];
    partyPayments: PartyPayment[];
    companyPayments: CompanyPayment[];
    dailyReconciliations: DailyReconciliation[];
    companies?: Company[];
    companyInvoices?: CompanyInvoice[];
    settings?: any;
  };
}

/**
 * Ensures shared-storage folders exist on the device:
 * Smart Technology/
 * Smart Technology/Backup/
 * Smart Technology/Data/
 */
export async function ensureStorageFolders(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    await Filesystem.mkdir({
      path: FOLDER_BACKUP,
      directory: Directory.Documents,
      recursive: true,
    }).catch(() => {});

    await Filesystem.mkdir({
      path: FOLDER_DATA,
      directory: Directory.Documents,
      recursive: true,
    }).catch(() => {});

    return true;
  } catch (err) {
    console.warn('Could not ensure storage folders:', err);
    return false;
  }
}

/**
 * Generates the complete, standardized, versioned backup payload from Dexie IndexedDB
 */
export async function generateBackupPayload(): Promise<BackupDataPayload> {
  const [
    parties,
    invoices,
    partyPayments,
    companyPayments,
    settingsList,
    dailyReconciliations,
    companies,
    companyInvoices,
  ] = await Promise.all([
    db.parties.toArray(),
    db.invoices.toArray(),
    db.partyPayments.toArray(),
    db.companyPayments.toArray(),
    db.settings.toArray(),
    db.dailyReconciliations.toArray(),
    db.companies.toArray(),
    db.companyInvoices.toArray(),
  ]);

  const timestamp = new Date().toISOString();
  const settingsObj = settingsList.length > 0 ? settingsList[0] : (settingsList as any);

  const payload: BackupDataPayload = {
    backupFormatVersion: 1,
    appVersion: '1.3',
    databaseVersion: 4,
    createdAt: timestamp,
    updatedAt: timestamp,
    appName: 'Login Smart Technology Business Ledger',
    parties,
    invoices,
    partyPayments,
    companyPayments,
    dailyReconciliations,
    companies,
    companyInvoices,
    settings: settingsList,
    data: {
      parties,
      invoices,
      partyPayments,
      companyPayments,
      dailyReconciliations,
      companies,
      companyInvoices,
      settings: settingsObj,
    },
  };

  return payload;
}

/**
 * Atomically writes the local backup into Smart Technology/Backup/latest_backup.json
 * 1. Writes to temporary file (latest_backup.tmp)
 * 2. Verifies integrity of the written file (not empty, valid JSON, required tables)
 * 3. Commits to target file (latest_backup.json)
 * 4. Cleans up temporary file
 * 5. If failure occurs, leaves old valid backup completely untouched
 */
export async function writeLocalBackupAtomically(
  providedPayload?: BackupDataPayload
): Promise<{ success: boolean; path?: string; message: string; timestamp: string; count: number }> {
  const payload = providedPayload || (await generateBackupPayload());
  const jsonStr = JSON.stringify(payload, null, 2);
  const totalCount =
    payload.parties.length +
    payload.invoices.length +
    payload.partyPayments.length +
    payload.companyPayments.length +
    payload.dailyReconciliations.length;

  const timestamp = payload.updatedAt;

  if (Capacitor.isNativePlatform()) {
    const tempPath = `${FOLDER_BACKUP}/${FILE_BACKUP_TEMP}`;
    const finalPath = `${FOLDER_BACKUP}/${FILE_BACKUP_NAME}`;

    try {
      await ensureStorageFolders();

      // Step 1: Write to temporary file
      await Filesystem.writeFile({
        path: tempPath,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      // Step 2: Verify integrity by reading back and validating
      const readBack = await Filesystem.readFile({
        path: tempPath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      if (!readBack.data || (typeof readBack.data === 'string' && readBack.data.trim().length === 0)) {
        throw new Error('Temporary backup file is empty.');
      }

      const parsedCheck = JSON.parse(readBack.data as string);
      const validation = validateBackupPayload(parsedCheck);
      if (!validation.valid) {
        throw new Error(`Temporary backup validation failed: ${validation.error}`);
      }

      // Step 3: Replace target backup file with verified content
      const savedFinal = await Filesystem.writeFile({
        path: finalPath,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      // Step 4: Delete temporary buffer
      await Filesystem.deleteFile({
        path: tempPath,
        directory: Directory.Documents,
      }).catch(() => {});

      // Record local timestamp and count
      try {
        localStorage.setItem('last_local_backup_time', timestamp);
        localStorage.setItem('last_local_backup_count', String(totalCount));
      } catch {}

      return {
        success: true,
        path: savedFinal.uri,
        message: `Local backup saved successfully to ${finalPath}`,
        timestamp,
        count: totalCount,
      };
    } catch (err: any) {
      console.error('Atomic local backup write error:', err);
      // Clean up temp file on failure, leave existing latest_backup.json intact
      try {
        await Filesystem.deleteFile({
          path: tempPath,
          directory: Directory.Documents,
        }).catch(() => {});
      } catch {}

      return {
        success: false,
        message: `Failed to save local backup: ${err.message || err}`,
        timestamp,
        count: totalCount,
      };
    }
  } else {
    // Browser fallback
    try {
      localStorage.setItem('browser_ledger_backup', jsonStr);
      localStorage.setItem('last_local_backup_time', timestamp);
      localStorage.setItem('last_local_backup_count', String(totalCount));
    } catch {}

    return {
      success: true,
      message: 'Local browser backup snapshot updated.',
      timestamp,
      count: totalCount,
    };
  }
}

/**
 * Reads the current latest_backup.json directly from Smart Technology/Backup/
 */
export async function readLatestBackupFromFile(): Promise<{
  success: boolean;
  payload?: BackupDataPayload;
  message: string;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const finalPath = `${FOLDER_BACKUP}/${FILE_BACKUP_NAME}`;
      const fileRes = await Filesystem.readFile({
        path: finalPath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      if (!fileRes.data || (typeof fileRes.data === 'string' && fileRes.data.trim().length === 0)) {
        return { success: false, message: 'Backup file is empty or does not exist.' };
      }

      const parsed = JSON.parse(fileRes.data as string);
      const validation = validateBackupPayload(parsed);
      if (!validation.valid || !validation.normalized) {
        return { success: false, message: validation.error || 'Backup file is corrupted.' };
      }

      return { success: true, payload: validation.normalized, message: 'Backup file read successfully.' };
    } catch (err: any) {
      return { success: false, message: `Could not read ${FILE_BACKUP_NAME}: ${err.message || err}` };
    }
  } else {
    const raw = localStorage.getItem('browser_ledger_backup');
    if (!raw) {
      return { success: false, message: 'No local backup found in browser storage.' };
    }
    try {
      const parsed = JSON.parse(raw);
      const validation = validateBackupPayload(parsed);
      if (!validation.valid || !validation.normalized) {
        return { success: false, message: validation.error || 'Backup is invalid.' };
      }
      return { success: true, payload: validation.normalized, message: 'Backup read successfully.' };
    } catch {
      return { success: false, message: 'Could not parse browser backup data.' };
    }
  }
}

/**
 * Validates a parsed JSON payload to ensure it is a valid backup file
 */
export function validateBackupPayload(data: any): { valid: boolean; normalized?: BackupDataPayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON file format.' };
  }

  // Handle both top-level and data-wrapped objects
  const parties = Array.isArray(data.parties) ? data.parties : data.data?.parties;
  const invoices = Array.isArray(data.invoices) ? data.invoices : data.data?.invoices;
  const partyPayments = Array.isArray(data.partyPayments) ? data.partyPayments : data.data?.partyPayments;
  const companyPayments = Array.isArray(data.companyPayments) ? data.companyPayments : data.data?.companyPayments;
  const rawSettings = data.settings !== undefined ? data.settings : data.data?.settings;
  const dailyReconciliations = Array.isArray(data.dailyReconciliations)
    ? data.dailyReconciliations
    : data.data?.dailyReconciliations || [];

  if (!Array.isArray(parties)) {
    return { valid: false, error: 'Backup is missing required "parties" table.' };
  }
  if (!Array.isArray(invoices)) {
    return { valid: false, error: 'Backup is missing required "invoices" table.' };
  }
  if (!Array.isArray(partyPayments)) {
    return { valid: false, error: 'Backup is missing required "partyPayments" table.' };
  }
  if (!Array.isArray(companyPayments)) {
    return { valid: false, error: 'Backup is missing required "companyPayments" table.' };
  }

  const companies = Array.isArray(data.companies)
    ? data.companies
    : Array.isArray(data.data?.companies)
    ? data.data.companies
    : [];

  const companyInvoices = Array.isArray(data.companyInvoices)
    ? data.companyInvoices
    : Array.isArray(data.data?.companyInvoices)
    ? data.data.companyInvoices
    : [];

  // Normalize settings to AppSettings[]
  let settingsList: AppSettings[] = [];
  if (Array.isArray(rawSettings)) {
    settingsList = rawSettings;
  } else if (rawSettings && typeof rawSettings === 'object') {
    settingsList = [rawSettings];
  }

  const normalized: BackupDataPayload = {
    backupFormatVersion: data.backupFormatVersion || data.version || 1,
    appVersion: data.appVersion || '1.2',
    databaseVersion: data.databaseVersion || 3,
    createdAt: data.createdAt || data.updatedAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.exportedAt || new Date().toISOString(),
    appName: data.appName || 'Login Smart Technology Business Ledger',
    parties,
    invoices,
    partyPayments,
    companyPayments,
    dailyReconciliations,
    companies,
    companyInvoices,
    settings: settingsList,
    data: {
      parties,
      invoices,
      partyPayments,
      companyPayments,
      dailyReconciliations,
      companies,
      companyInvoices,
      settings: settingsList.length > 0 ? settingsList[0] : rawSettings,
    },
  };

  return { valid: true, normalized };
}

/**
 * Safely restores all application tables from an authorized JSON backup payload.
 * Takes a safety snapshot of current data before making any changes.
 * If any error occurs during restoration, restores the safety snapshot immediately.
 */
export async function restoreBackupSafely(rawPayload: any): Promise<{
  success: boolean;
  message: string;
  partiesCount?: number;
  invoicesCount?: number;
  partyPaymentsCount?: number;
  companyPaymentsCount?: number;
  companiesCount?: number;
  companyInvoicesCount?: number;
}> {
  // Step 1: Validate payload format before touching anything
  const validation = validateBackupPayload(rawPayload);
  if (!validation.valid || !validation.normalized) {
    return {
      success: false,
      message: validation.error || 'Invalid backup structure. Restore aborted.',
    };
  }

  const payload = validation.normalized;

  // Step 2: Check for accidentally empty backup wiping non-empty database
  const incomingTotal =
    payload.parties.length +
    payload.invoices.length +
    payload.partyPayments.length +
    (payload.companies?.length || 0) +
    (payload.companyInvoices?.length || 0);

  const currentTotal =
    (await db.parties.count()) +
    (await db.invoices.count()) +
    (await db.partyPayments.count()) +
    (await db.companies.count()) +
    (await db.companyInvoices.count());

  if (incomingTotal === 0 && currentTotal > 0) {
    return {
      success: false,
      message: 'Restore rejected: The selected backup contains zero records and would wipe your existing ledger data.',
    };
  }

  // Step 3: Create complete in-memory safety snapshot of current local data
  let safetySnapshot: {
    parties: Party[];
    invoices: PartyInvoice[];
    partyPayments: PartyPayment[];
    companyPayments: CompanyPayment[];
    dailyReconciliations: DailyReconciliation[];
    companies: Company[];
    companyInvoices: CompanyInvoice[];
    settings: AppSettings[];
  };

  try {
    safetySnapshot = {
      parties: await db.parties.toArray(),
      invoices: await db.invoices.toArray(),
      partyPayments: await db.partyPayments.toArray(),
      companyPayments: await db.companyPayments.toArray(),
      dailyReconciliations: await db.dailyReconciliations.toArray(),
      companies: await db.companies.toArray(),
      companyInvoices: await db.companyInvoices.toArray(),
      settings: await db.settings.toArray(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to create safety snapshot: ${err.message || err}. Database was not modified.`,
    };
  }

  // Step 4: Perform restore within transaction
  try {
    // Enrich legacy invoices and party payments if companyId is missing (e.g. from v1/v2/v3 backups)
    const enrichedInvoices = payload.invoices.map((inv) => {
      if (!inv.companyId && payload.companyInvoices && payload.companyInvoices.length > 0) {
        const match = payload.companyInvoices.find(
          (ci) => String(ci.invoiceNumber).trim().toLowerCase() === String(inv.invoiceNumber).trim().toLowerCase()
        );
        if (match) {
          return {
            ...inv,
            companyId: match.companyId,
            companyName: match.companyName,
          };
        }
      }
      if (!inv.companyId && payload.companies && payload.companies.length === 1) {
        return {
          ...inv,
          companyId: payload.companies[0].id,
          companyName: payload.companies[0].name,
        };
      }
      return inv;
    });

    const enrichedPartyPayments = payload.partyPayments.map((pmt) => {
      if (!pmt.companyId && payload.companies && payload.companies.length === 1) {
        return {
          ...pmt,
          companyId: payload.companies[0].id,
          companyName: payload.companies[0].name,
        };
      }
      return pmt;
    });

    await db.transaction(
      'rw',
      [
        db.parties,
        db.invoices,
        db.partyPayments,
        db.companyPayments,
        db.settings,
        db.dailyReconciliations,
        db.companies,
        db.companyInvoices,
      ],
      async () => {
        // Clear tables
        await db.parties.clear();
        await db.invoices.clear();
        await db.partyPayments.clear();
        await db.companyPayments.clear();
        await db.dailyReconciliations.clear();
        await db.companies.clear();
        await db.companyInvoices.clear();

        // Restore verified records
        if (payload.parties.length > 0) {
          await db.parties.bulkAdd(payload.parties);
        }
        if (enrichedInvoices.length > 0) {
          await db.invoices.bulkAdd(enrichedInvoices);
        }
        if (enrichedPartyPayments.length > 0) {
          await db.partyPayments.bulkAdd(enrichedPartyPayments);
        }
        if (payload.companyPayments.length > 0) {
          await db.companyPayments.bulkAdd(payload.companyPayments);
        }
        if (payload.settings && payload.settings.length > 0) {
          await db.settings.clear();
          await db.settings.bulkAdd(payload.settings);
        }
        if (payload.dailyReconciliations.length > 0) {
          await db.dailyReconciliations.bulkAdd(payload.dailyReconciliations);
        }
        if (payload.companies && payload.companies.length > 0) {
          await db.companies.bulkAdd(payload.companies);
        }
        if (payload.companyInvoices && payload.companyInvoices.length > 0) {
          await db.companyInvoices.bulkAdd(payload.companyInvoices);
        }
      }
    );

    // Update local backup with newly restored state
    await writeLocalBackupAtomically(payload);

    return {
      success: true,
      message: `Restored ${payload.parties.length} parties, ${payload.invoices.length} invoices, and ${payload.companies?.length || 0} companies successfully.`,
      partiesCount: payload.parties.length,
      invoicesCount: payload.invoices.length,
      partyPaymentsCount: payload.partyPayments.length,
      companyPaymentsCount: payload.companyPayments.length,
      companiesCount: payload.companies?.length || 0,
      companyInvoicesCount: payload.companyInvoices?.length || 0,
    };
  } catch (restoreErr: any) {
    console.error('Restore failed, initiating rollback from safety snapshot:', restoreErr);

    // Rollback to safety snapshot
    try {
      await db.transaction(
        'rw',
        [
          db.parties,
          db.invoices,
          db.partyPayments,
          db.companyPayments,
          db.settings,
          db.dailyReconciliations,
          db.companies,
          db.companyInvoices,
        ],
        async () => {
          await db.parties.clear();
          if (safetySnapshot.parties.length > 0) await db.parties.bulkAdd(safetySnapshot.parties);

          await db.invoices.clear();
          if (safetySnapshot.invoices.length > 0) await db.invoices.bulkAdd(safetySnapshot.invoices);

          await db.partyPayments.clear();
          if (safetySnapshot.partyPayments.length > 0) await db.partyPayments.bulkAdd(safetySnapshot.partyPayments);

          await db.companyPayments.clear();
          if (safetySnapshot.companyPayments.length > 0) await db.companyPayments.bulkAdd(safetySnapshot.companyPayments);

          await db.dailyReconciliations.clear();
          if (safetySnapshot.dailyReconciliations.length > 0) await db.dailyReconciliations.bulkAdd(safetySnapshot.dailyReconciliations);

          await db.companies.clear();
          if (safetySnapshot.companies.length > 0) await db.companies.bulkAdd(safetySnapshot.companies);

          await db.companyInvoices.clear();
          if (safetySnapshot.companyInvoices.length > 0) await db.companyInvoices.bulkAdd(safetySnapshot.companyInvoices);

          if (safetySnapshot.settings.length > 0) {
            await db.settings.clear();
            await db.settings.bulkAdd(safetySnapshot.settings);
          }
        }
      );
    } catch (rollbackErr) {
      console.error('Rollback failure:', rollbackErr);
    }

    return {
      success: false,
      message: `Restore failed: ${restoreErr.message || restoreErr}. Previous data was preserved.`,
    };
  }
}

/**
 * Backward-compatible wrapper for existing components
 */
export async function restoreBackupData(payload: BackupDataPayload): Promise<{
  partiesCount: number;
  invoicesCount: number;
  partyPaymentsCount: number;
  companyPaymentsCount: number;
}> {
  const res = await restoreBackupSafely(payload);
  if (!res.success) {
    throw new Error(res.message);
  }
  return {
    partiesCount: res.partiesCount || 0,
    invoicesCount: res.invoicesCount || 0,
    partyPaymentsCount: res.partyPaymentsCount || 0,
    companyPaymentsCount: res.companyPaymentsCount || 0,
  };
}

/**
 * Exports complete application database to a structured JSON file download
 */
export async function exportBackupFile(): Promise<{ filename: string; count: number }> {
  const payload = await generateBackupPayload();
  const totalCount =
    payload.parties.length +
    payload.invoices.length +
    payload.partyPayments.length +
    payload.companyPayments.length +
    payload.dailyReconciliations.length;

  const jsonStr = JSON.stringify(payload, null, 2);
  const filename = `SmartTech_Ledger_Backup_${formatDateDisplay(getTodayDateString())}.json`;

  if (Capacitor.isNativePlatform()) {
    let fileUri = '';
    try {
      const writeRes = await Filesystem.writeFile({
        path: `${FOLDER_BACKUP}/${filename}`,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      fileUri = writeRes.uri;
    } catch {
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      fileUri = writeRes.uri;
    }

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
