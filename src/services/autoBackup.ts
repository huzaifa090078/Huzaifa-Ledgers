/**
 * Pure Local Automatic Backup Manager
 * - 100% Offline with ZERO external server or cloud dependencies
 * - Hooks into Dexie database mutations to automatically detect data changes
 * - Safely and debouncingly creates atomic local backups in Smart Technology/Backup/latest_backup.json
 * - Broadcasts backup lifecycle status to Settings and UI
 */

import { db } from '../db';
import {
  ensureStorageFolders,
  generateBackupPayload,
  writeLocalBackupAtomically,
  type BackupDataPayload,
} from './backup';

export type AutoBackupStatus =
  | 'up_to_date'
  | 'updating'
  | 'waiting'
  | 'error';

export interface BackupStatusState {
  status: AutoBackupStatus;
  label: string;
  detail?: string;
  lastBackupTime?: string;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;
let currentStatus: AutoBackupStatus = 'up_to_date';
let currentStatusLabel = 'Backup: Up to date';
let currentStatusDetail = '';

export function notifyStatusChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backup:status-changed'));
  }
}

export function getAutoBackupStatus(): BackupStatusState {
  const lastLocalTime = localStorage.getItem('last_local_backup_time') || undefined;

  let label = currentStatusLabel;
  let status = currentStatus;

  if (!lastLocalTime && status === 'up_to_date') {
    label = 'Backup: Ready';
  }

  return {
    status,
    label,
    detail: currentStatusDetail,
    lastBackupTime: lastLocalTime,
  };
}

function updateStatus(status: AutoBackupStatus, label: string, detail = ''): void {
  currentStatus = status;
  currentStatusLabel = label;
  currentStatusDetail = detail;
  notifyStatusChanged();
}

/**
 * Triggers the automatic local backup sequence:
 * 1. Debounced wait (~2.5s) to aggregate multiple rapid edits
 * 2. Atomic local backup write to Smart Technology/Backup/latest_backup.json
 */
export function triggerAutoBackup(delayMs = 2500): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  updateStatus('waiting', 'Backup: Waiting to update', 'Changes detected');

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await performAutoBackup();
  }, delayMs);
}

/**
 * Executes the atomic backup write operation immediately
 */
export async function performAutoBackup(): Promise<{ success: boolean; message: string }> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  try {
    updateStatus('updating', 'Backup: Updating...', 'Writing to Smart Technology/Backup/latest_backup.json');

    const payload: BackupDataPayload = await generateBackupPayload();
    const localRes = await writeLocalBackupAtomically(payload);

    if (localRes.success) {
      updateStatus('up_to_date', 'Backup: Up to date', 'Saved to Smart Technology/Backup/latest_backup.json');
      return { success: true, message: 'Local backup updated successfully.' };
    } else {
      updateStatus('error', 'Backup: Failed — Will retry', localRes.message);
      return { success: false, message: localRes.message };
    }
  } catch (err: any) {
    console.error('Local auto backup execution error:', err);
    updateStatus('error', 'Backup: Failed — Will retry', err.message || String(err));
    return { success: false, message: err.message || 'Auto backup encountered an unexpected error.' };
  }
}

/**
 * Initializes table mutation hooks on app launch
 */
export async function initAutoBackupSystem(): Promise<void> {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    // 1. Ensure shared storage folders exist
    await ensureStorageFolders();

    // 2. Attach hooks to Dexie database tables to catch every data change automatically
    const tables = [
      db.parties,
      db.invoices,
      db.partyPayments,
      db.companyPayments,
      db.dailyReconciliations,
      db.settings,
    ];

    tables.forEach((table) => {
      try {
        table.hook('creating', () => {
          triggerAutoBackup();
        });
        table.hook('updating', () => {
          triggerAutoBackup();
        });
        table.hook('deleting', () => {
          triggerAutoBackup();
        });
      } catch (hookErr) {
        console.warn('Could not attach table hook:', hookErr);
      }
    });

    // 3. Ensure pending backup is not lost if app is closing
    if (typeof window !== 'undefined') {
      const flushPending = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
          // Synchronous trigger for quick storage
          performAutoBackup();
        }
      };
      window.addEventListener('beforeunload', flushPending);
      window.addEventListener('pagehide', flushPending);
    }

    // 4. Initial backup check: if app already has data, create initial local backup
    const lastBackupTime = localStorage.getItem('last_local_backup_time');
    const partiesCount = await db.parties.count();

    if (!lastBackupTime && partiesCount > 0) {
      triggerAutoBackup(1000);
    }
  } catch (err) {
    console.warn('Auto backup system initialization warning:', err);
  }
}
