import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import type {
  Party,
  PartyInvoice,
  PartyPayment,
  CompanyPayment,
  Company,
  CompanyInvoice,
} from '../types';
import {
  exportBackupFile,
  validateBackupPayload,
  restoreBackupSafely,
  readLatestBackupFromFile,
  type BackupDataPayload,
} from '../services/backup';
import { clearAllData, db, generateId } from '../db';
import { getTodayDateString, formatLocalTimestamp } from '../services/accounting';
import {
  getAutoBackupStatus,
  performAutoBackup,
  type BackupStatusState,
} from '../services/autoBackup';

interface SettingsProps {
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  companies?: Company[];
  companyInvoices?: (PartyInvoice | CompanyInvoice)[];
  onDataChanged: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  parties,
  invoices,
  partyPayments,
  companyPayments,
  companies = [],
  companyInvoices = [],
  onDataChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [readingLatest, setReadingLatest] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<BackupDataPayload | null>(null);
  const [restoreSourceNote, setRestoreSourceNote] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto Backup state
  const [backupStatus, setBackupStatus] = useState<BackupStatusState>(getAutoBackupStatus());

  const refreshStatus = useCallback(() => {
    setBackupStatus(getAutoBackupStatus());
  }, []);

  useEffect(() => {
    refreshStatus();
    const handleStatusChange = () => refreshStatus();
    window.addEventListener('backup:status-changed', handleStatusChange);

    return () => {
      window.removeEventListener('backup:status-changed', handleStatusChange);
    };
  }, [refreshStatus]);

  // Listen for Android Back Button event to dismiss confirm dialogs if open
  useEffect(() => {
    const handleAppBack = (e: Event) => {
      if (clearModalOpen) {
        e.preventDefault();
        setClearModalOpen(false);
      } else if (restoreModalOpen) {
        e.preventDefault();
        setRestoreModalOpen(false);
      }
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [clearModalOpen, restoreModalOpen]);

  // Manual trigger for safe local backup
  const handleManualBackup = async () => {
    try {
      setBackingUp(true);
      const res = await performAutoBackup();
      refreshStatus();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Backup failed.' });
    } finally {
      setBackingUp(false);
    }
  };

  // Restore directly from Smart Technology/Backup/latest_backup.json
  const handleRestoreFromLatest = async () => {
    try {
      setReadingLatest(true);
      const res = await readLatestBackupFromFile();
      if (!res.success || !res.payload) {
        setFeedback({
          type: 'error',
          message: res.message || 'Could not load latest_backup.json.',
        });
        return;
      }

      setPendingRestorePayload(res.payload);
      setRestoreSourceNote('Smart Technology/Backup/latest_backup.json');
      setRestoreModalOpen(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Failed to load latest backup: ${err.message || err}`,
      });
    } finally {
      setReadingLatest(false);
    }
  };

  // Export / share backup JSON to file or Android share sheet
  const handleExportBackup = async () => {
    try {
      setExporting(true);
      const res = await exportBackupFile();
      setFeedback({
        type: 'success',
        message: `Backup created successfully (${res.count} records saved in ${res.filename})`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Backup failed.' });
    } finally {
      setExporting(false);
    }
  };

  // Select external JSON file for restore
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validation = validateBackupPayload(parsed);
        if (!validation.valid || !validation.normalized) {
          setFeedback({ type: 'error', message: validation.error || 'Invalid backup file.' });
          return;
        }

        setPendingRestorePayload(validation.normalized);
        setRestoreSourceNote(`Selected file: ${file.name}`);
        setRestoreModalOpen(true);
      } catch {
        setFeedback({ type: 'error', message: 'Unable to parse JSON backup file.' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute restore with in-memory rollback guarantee
  const confirmRestore = async () => {
    if (!pendingRestorePayload) return;
    try {
      const result = await restoreBackupSafely(pendingRestorePayload);
      setRestoreModalOpen(false);
      setPendingRestorePayload(null);
      if (result.success) {
        onDataChanged();
        refreshStatus();
        setFeedback({
          type: 'success',
          message: result.message,
        });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Restore failed.' });
    }
  };

  const confirmClearAll = async () => {
    try {
      await clearAllData();
      setClearModalOpen(false);
      onDataChanged();
      setFeedback({ type: 'success', message: 'All local application data has been cleared.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to clear data.' });
    }
  };

  const seedSampleData = async () => {
    try {
      const today = getTodayDateString();
      const p1: Party = {
        id: generateId(),
        name: 'Ali Traders',
        phone: '0300-1234567',
        address: 'Shop #4, Main Market, Lahore',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const p2: Party = {
        id: generateId(),
        name: 'Bilal Traders',
        phone: '0321-9876543',
        address: 'Shop #12, Commercial Market, Lahore',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const p3: Party = {
        id: generateId(),
        name: 'Usman General Store',
        phone: '0333-5554433',
        address: 'Shop #18, Saddar Bazaar, Karachi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const inv1: PartyInvoice = {
        id: generateId(),
        invoiceNumber: 'A-1025',
        partyId: p1.id,
        partyName: p1.name,
        date: today,
        amount: 30000,
        description: 'Stock supply items',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const inv2: PartyInvoice = {
        id: generateId(),
        invoiceNumber: 'B-1026',
        partyId: p2.id,
        partyName: p2.name,
        date: today,
        amount: 45000,
        description: 'Retail goods delivery',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const inv3: PartyInvoice = {
        id: generateId(),
        invoiceNumber: 'U-1027',
        partyId: p3.id,
        partyName: p3.name,
        date: today,
        amount: 15000,
        description: 'Assorted product inventory',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pmt1: PartyPayment = {
        id: generateId(),
        partyId: p1.id,
        partyName: p1.name,
        date: today,
        amount: 10000,
        paymentMethod: 'Cash',
        reference: 'Cash Received',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cpmt1: CompanyPayment = {
        id: generateId(),
        date: today,
        amount: 15000,
        paymentMethod: 'Bank',
        reference: 'HBL-DEP-4912',
        note: 'Salesman deposit to Login Smart Technology company account',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.parties.bulkAdd([p1, p2, p3]);
      await db.invoices.bulkAdd([inv1, inv2, inv3]);
      await db.partyPayments.bulkAdd([pmt1]);
      await db.companyPayments.bulkAdd([cpmt1]);

      onDataChanged();
      setFeedback({ type: 'success', message: 'Sample scenario data loaded successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load demo data.' });
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Settings Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 mb-1">
          <Database className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-bold text-slate-900 m-0">
            Backup & Data Management
          </h2>
        </div>
        <p className="text-xs text-slate-500 m-0">
          This application operates 100% offline. All financial records are stored securely on this phone.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs rounded-xl border flex items-center justify-between animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Robust Automatic Local Backup Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 m-0">Automatic Local Backup</h3>
          </div>

          {/* Status Badge */}
          <div className="flex items-center">
            {backupStatus.status === 'up_to_date' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                {backupStatus.label}
              </span>
            )}
            {backupStatus.status === 'updating' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                <RefreshCw className="w-3 h-3 mr-1 text-sky-600 animate-spin" />
                {backupStatus.label}
              </span>
            )}
            {backupStatus.status === 'waiting' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3 h-3 mr-1 text-amber-600" />
                {backupStatus.label}
              </span>
            )}
            {backupStatus.status === 'error' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
                <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
                {backupStatus.label}
              </span>
            )}
          </div>
        </div>

        {/* Local Folder & File Structure */}
        <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Backup File:</span>
            <span className="font-mono text-slate-800 font-semibold text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Smart Technology/Backup/latest_backup.json
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">PDF Documents:</span>
            <span className="font-mono text-slate-800 font-semibold text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Smart Technology/Data/
            </span>
          </div>
          {backupStatus.lastBackupTime && (
            <div className="flex justify-between items-center border-t border-slate-200/80 pt-1.5 mt-1">
              <span className="text-slate-500 font-medium">Last Local Backup:</span>
              <span className="font-semibold text-slate-800">
                {formatLocalTimestamp(backupStatus.lastBackupTime)}
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 m-0">
          Backups update automatically whenever parties, invoices, payments, or collections are added or modified.
        </p>

        {/* Action Buttons: Backup Data & Restore from Latest */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={handleManualBackup}
            disabled={backingUp}
            className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition disabled:opacity-50 inline-flex items-center justify-center"
          >
            <Download className={`w-3.5 h-3.5 mr-1.5 ${backingUp ? 'animate-bounce' : ''}`} />
            {backingUp ? 'Saving...' : 'Backup Data'}
          </button>

          <button
            onClick={handleRestoreFromLatest}
            disabled={readingLatest}
            className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition disabled:opacity-50 inline-flex items-center justify-center"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            {readingLatest ? 'Checking...' : 'Restore from Backup'}
          </button>
        </div>
      </div>

      {/* Database Statistics Card */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Local Storage Database Stats
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Parties</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{parties.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Party Inv.</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{invoices.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Party Pmts</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{partyPayments.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Companies</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{companies.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Co. Inv.</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{companyInvoices.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Co. Pmts</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{companyPayments.length}</span>
          </div>
        </div>
      </div>

      {/* Additional File Management Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* Export / Share Backup File */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Export / Share Backup (JSON)</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Share or copy complete JSON backup file to another device or SD card.
            </p>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-xs transition shrink-0 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Saving...' : 'Share File'}
          </button>
        </div>

        {/* Restore from Selected File */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Restore from File (JSON)</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Select a JSON backup file from phone storage to restore records safely.
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition shrink-0"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Choose File
            </button>
          </div>
        </div>

        {/* Demo Data Seed */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Load Demo Data</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Load sample parties (Ali Traders, Bilal Traders), invoices, and deposits.
            </p>
          </div>
          <button
            onClick={seedSampleData}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Load Demo
          </button>
        </div>

        {/* Reset Database */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-red-700 m-0">Reset All Data</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Permanently wipe all local ledger records from this device.
            </p>
          </div>
          <button
            onClick={() => setClearModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Offline & Security Information Banner */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center space-x-2 text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider m-0">
            Privacy & Security Guarantee
          </h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed m-0">
          • All financial figures remain strictly inside your device local storage (IndexedDB).
          <br />
          • Backups are saved locally in phone storage under <span className="font-semibold text-slate-700">Smart Technology/Backup/</span>.
          <br />
          • No internet connection, cloud server, or third-party tracking is used.
        </p>
        <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 flex items-center justify-between">
          <span>Login Smart Technology Business Ledger v1.2.0</span>
          <span>100% Offline App</span>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {restoreModalOpen && pendingRestorePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-5 space-y-4 my-auto">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 m-0">Confirm Safe Restore</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              Restoring this backup will replace current records with verified records from:
            </p>

            {restoreSourceNote && (
              <p className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 break-all m-0">
                {restoreSourceNote}
              </p>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                Backup Date:{' '}
                {formatLocalTimestamp(pendingRestorePayload.updatedAt || pendingRestorePayload.createdAt)}
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.parties?.length || 0} Parties
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.invoices?.length || 0} Party Invoices
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.partyPayments?.length || 0} Party Payments
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.companies?.length || 0} Companies
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.companyInvoices?.length || 0} Company Invoices
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.companyPayments?.length || 0} Company Payments
              </div>
            </div>

            <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs">
              <span className="font-bold">🛡️ Safety Protection Active:</span> A complete in-memory snapshot of your current database will be saved before restore. If any issue occurs, it will automatically roll back so your data is never lost.
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setPendingRestorePayload(null);
                }}
                className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-5 space-y-4 my-auto">
            <div className="flex items-center space-x-2 text-red-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-red-900 m-0">Reset All Ledger Data</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              Are you sure you want to permanently delete all parties, invoices, and payment records from this device? This action cannot be undone.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setClearModalOpen(false)}
                className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
