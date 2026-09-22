import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment } from '../types';
import { exportBackupFile, validateBackupPayload, restoreBackupData } from '../services/backup';
import { clearAllData, db, generateId } from '../db';
import { getTodayDateString } from '../services/accounting';

interface SettingsProps {
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  onDataChanged: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  parties,
  invoices,
  partyPayments,
  companyPayments,
  onDataChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validation = validateBackupPayload(parsed);
        if (!validation.valid) {
          setFeedback({ type: 'error', message: validation.error || 'Invalid backup file.' });
          return;
        }

        setPendingRestorePayload(parsed);
        setRestoreModalOpen(true);
      } catch (err) {
        setFeedback({ type: 'error', message: 'Unable to parse JSON backup file.' });
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-select same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmRestore = async () => {
    if (!pendingRestorePayload) return;
    try {
      const counts = await restoreBackupData(pendingRestorePayload);
      setRestoreModalOpen(false);
      setPendingRestorePayload(null);
      onDataChanged();
      setFeedback({
        type: 'success',
        message: `Restored successfully: ${counts.partiesCount} parties, ${counts.invoicesCount} invoices, ${counts.partyPaymentsCount} recoveries, ${counts.companyPaymentsCount} company deposits.`,
      });
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
        name: 'Ali Mobiles',
        phone: '0300-1234567',
        address: 'Shop #4, Hall Road, Lahore',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const p2: Party = {
        id: generateId(),
        name: 'Bilal Traders',
        phone: '0321-9876543',
        address: 'Main Market, Hafeez Centre, Lahore',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const p3: Party = {
        id: generateId(),
        name: 'Usman Accessories',
        phone: '0333-5554433',
        address: 'Shop #18, Regal Chowk, Karachi',
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
        description: 'Smart Tech chargers & power banks',
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
        description: 'Wireless earbuds and cables',
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
        description: 'Screen protectors & back covers',
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
        note: 'Salesman deposit to Smart Tech company account',
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
          This application works 100% offline. All financial records are stored securely on this device.
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

      {/* Database Statistics Card */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Local Storage Database Stats
        </span>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Parties</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{parties.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Invoices</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{invoices.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Party Pmts</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{partyPayments.length}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Co. Pmts</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{companyPayments.length}</span>
          </div>
        </div>
      </div>

      {/* Backup and Restore Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* Export Backup */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Backup Data (JSON)</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Download complete application data file to your device or Google Drive.
            </p>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-xs transition shrink-0 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Saving...' : 'Backup'}
          </button>
        </div>

        {/* Restore Backup */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Restore Data (JSON)</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Select a previously exported JSON backup file to restore records.
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
              Restore
            </button>
          </div>
        </div>

        {/* Demo Data Seed */}
        <div className="p-4 flex items-center justify-between">
          <div className="pr-3">
            <h3 className="text-xs font-bold text-slate-800 m-0">Load Demo Data</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Load sample parties (Ali Mobiles, Bilal Traders), invoices, and deposits.
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
          • All financial figures remain strictly inside your device browser storage (IndexedDB).
          <br />
          • No external server sync or third-party tracking is involved.
          <br />
          • The app works 100% without an internet connection.
        </p>
        <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 flex items-center justify-between">
          <span>Smart Technology Mobile Ledger v1.0.0</span>
          <span>Offline PWA</span>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {restoreModalOpen && pendingRestorePayload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 m-0">Confirm Data Restore</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              Restoring this backup will replace current records with the contents of the file:
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                Export Date: {pendingRestorePayload.exportedAt || 'Unknown'}
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.parties?.length || 0} Parties
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.invoices?.length || 0} Invoices
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.partyPayments?.length || 0} Party Payments
              </div>
              <div className="text-slate-600">
                • {pendingRestorePayload.companyPayments?.length || 0} Company Deposits
              </div>
            </div>

            <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold">
              ⚠️ Warning: Existing data on this device will be overwritten.
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
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
