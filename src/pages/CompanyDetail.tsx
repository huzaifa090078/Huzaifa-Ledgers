import React, { useState, useEffect } from 'react';
import {
  Phone,
  MapPin,
  FileText,
  PlusCircle,
  Download,
  Share2,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowLeft,
  X,
  Building2,
} from 'lucide-react';
import type { Company, CompanyInvoice, CompanyPayment } from '../types';
import {
  getCompanyLedgerTimeline,
  calculateSingleCompanyBalance,
  calculateCompanyPeriodLedger,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
} from '../services/accounting';
import { exportCompanyLedgerPDF } from '../services/pdf';
import { shareCompanyLedger } from '../services/share';

const getFirstDayOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getLast30DaysDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

interface CompanyDetailProps {
  company: Company;
  invoices: CompanyInvoice[];
  companyPayments: CompanyPayment[];
  onBack: () => void;
  onOpenAddInvoice: (companyId: string) => void;
  onOpenRecordPayment: (companyId: string) => void;
  onEditInvoice: (invoice: CompanyInvoice) => void;
  onDeleteInvoice: (invoice: CompanyInvoice) => void;
  onEditPayment: (payment: CompanyPayment) => void;
  onDeletePayment: (payment: CompanyPayment) => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  company,
  invoices,
  companyPayments,
  onBack,
  onOpenAddInvoice,
  onOpenRecordPayment,
  onEditInvoice,
  onDeleteInvoice,
  onEditPayment,
  onDeletePayment,
}) => {
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'full' | 'range'>('full');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayDateString());

  // Listen to Android hardware back button so it closes the export modal first
  useEffect(() => {
    if (!isExportModalOpen) return;
    const handleAppBack = (e: Event) => {
      e.preventDefault();
      setIsExportModalOpen(false);
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [isExportModalOpen]);

  const timeline = getCompanyLedgerTimeline(company.id, invoices, companyPayments);
  const balanceInfo = calculateSingleCompanyBalance(company.id, invoices, companyPayments);

  const handleExportPDF = async (
    destination: 'mobile' | 'whatsapp',
    customStart?: string,
    customEnd?: string
  ) => {
    setSharing(true);
    setShareFeedback(null);
    try {
      const res = await exportCompanyLedgerPDF(
        company,
        invoices,
        companyPayments,
        destination,
        undefined,
        customStart,
        customEnd
      );
      if (res?.message) {
        setShareFeedback(res.message);
        setTimeout(() => setShareFeedback(null), 4000);
      }
      setIsExportModalOpen(false);
    } catch (err: any) {
      setShareFeedback(
        destination === 'whatsapp'
          ? 'Failed to share PDF attachment on WhatsApp.'
          : 'Failed to save PDF to Mobile.'
      );
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      setSharing(false);
    }
  };

  const handleNormalShareWhatsApp = async () => {
    setSharing(true);
    setShareFeedback(null);
    try {
      const res = await shareCompanyLedger(company, invoices, companyPayments);
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 4000);
    } catch (err: any) {
      setShareFeedback('Could not trigger share.');
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      setSharing(false);
    }
  };

  const isRange = exportMode === 'range';
  const isDateRangeInvalid = isRange && startDate > endDate;
  const periodData = isRange
    ? calculateCompanyPeriodLedger(company.id, invoices, companyPayments, startDate, endDate)
    : null;

  return (
    <div className="space-y-3.5 pb-20">
      {/* Top Company Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white">
          <div className="mb-2">
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition -ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Companies List</span>
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                Company / Supplier Ledger
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight m-0">
                {company.name}
              </h2>
              {company.phone && (
                <div className="flex items-center space-x-1 text-slate-300 text-xs mt-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <a href={`tel:${company.phone}`} className="hover:underline font-mono">
                    {company.phone}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-center space-x-1 text-slate-400 text-[11px] mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{company.address}</span>
                </div>
              )}
            </div>

            {/* Current Balance / Remaining Amount */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                {balanceInfo.isAdvance ? 'Advance Balance' : 'Remaining Amount'}
              </span>
              <div
                className={`text-xl font-black font-mono tracking-tight ${
                  balanceInfo.isAdvance
                    ? 'text-emerald-400'
                    : balanceInfo.currentBalance > 0
                    ? 'text-indigo-300'
                    : 'text-slate-300'
                }`}
              >
                {balanceInfo.isAdvance
                  ? `(Adv: ${formatPKR(balanceInfo.advanceAmount)})`
                  : formatPKR(balanceInfo.currentBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Totals Banner */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Purchases (Amount Added)
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {formatPKR(balanceInfo.totalInvoices)}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Payments Made
            </span>
            <span className="font-bold text-emerald-700 font-mono">
              {formatPKR(balanceInfo.totalPayments)}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-white text-center">
          <button
            onClick={() => onOpenAddInvoice(company.id)}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-900 border border-indigo-200/70 transition"
          >
            <FileText className="w-4 h-4 text-indigo-700 mb-1" />
            <span className="text-[10px] font-semibold">+ Invoice</span>
          </button>

          <button
            onClick={() => onOpenRecordPayment(company.id)}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 border border-emerald-200/70 transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700 mb-1" />
            <span className="text-[10px] font-semibold">+ Payment</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-700 mb-1" />
            <span className="text-[10px] font-semibold">PDF Export</span>
          </button>

          <button
            onClick={() => handleNormalShareWhatsApp()}
            disabled={sharing}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-2xs transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-bold">Share</span>
          </button>
        </div>
      </div>

      {/* User Feedback Toast */}
      {shareFeedback && (
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-md">
          <span>{shareFeedback}</span>
          <button
            onClick={() => setShareFeedback(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ledger History Title */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
          Transaction History ({timeline.entries.length})
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">Running balance view</span>
      </div>

      {/* Ledger Timeline List */}
      {timeline.entries.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700 mb-1">No Transactions Recorded</h4>
          <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
            Record a purchase invoice or a payment to start this company's ledger timeline.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => onOpenAddInvoice(company.id)}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Add Purchase
            </button>
            <button
              onClick={() => onOpenRecordPayment(company.id)}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Record Payment
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.entries.map((entry) => {
            const isInv = entry.type === 'invoice';
            const isEntryAdvance = entry.balance < 0;

            return (
              <div
                key={entry.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Icon, Date, Description */}
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isInv
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isInv ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          {formatDateDisplay(entry.date)}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                            isInv
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isInv ? 'Purchase / Invoice' : 'Payment'}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800 mt-1 truncate m-0">
                        {entry.description}
                      </p>

                      {/* Transaction amount */}
                      <div className="flex items-center space-x-3 mt-1.5 text-[11px]">
                        {isInv ? (
                          <span className="text-indigo-700 font-bold font-mono">
                            Added: +{formatPKR(entry.debit)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold font-mono">
                            Paid: -{formatPKR(entry.credit)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Balance After Transaction & Actions */}
                  <div className="text-right pl-3 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isEntryAdvance ? 'Advance' : 'Remaining'}
                    </span>
                    <div
                      className={`text-sm font-black font-mono ${
                        isEntryAdvance
                          ? 'text-emerald-600'
                          : entry.balance > 0
                          ? 'text-indigo-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {isEntryAdvance
                        ? `(Adv: ${formatPKR(Math.abs(entry.balance))})`
                        : formatPKR(entry.balance)}
                    </div>

                    {/* Edit / Delete actions */}
                    <div className="flex items-center justify-end space-x-1 mt-2">
                      <button
                        onClick={() => {
                          if (isInv) {
                            onEditInvoice(entry.rawItem as CompanyInvoice);
                          } else {
                            onEditPayment(entry.rawItem as CompanyPayment);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (isInv) {
                            onDeleteInvoice(entry.rawItem as CompanyInvoice);
                          } else {
                            onDeletePayment(entry.rawItem as CompanyPayment);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Export Options Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 m-0">Company PDF Export</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Export Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Export Scope:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setExportMode('full')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      exportMode === 'full'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('range')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      exportMode === 'range'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Date Range
                  </button>
                </div>
              </div>

              {/* Date Range Inputs & Presets */}
              {isRange && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  {/* Preset Buttons */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(getFirstDayOfMonth());
                        setEndDate(getTodayDateString());
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md shrink-0 transition"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(getLast30DaysDate());
                        setEndDate(getTodayDateString());
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md shrink-0 transition"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(getFirstDayOfYear());
                        setEndDate(getTodayDateString());
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md shrink-0 transition"
                    >
                      This Year
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {isDateRangeInvalid && (
                    <p className="text-[11px] text-red-600 font-medium m-0">
                      From date cannot be after To date.
                    </p>
                  )}

                  {/* Range Calculation Preview */}
                  {periodData && !isDateRangeInvalid && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1.5">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Opening Balance (Prior to {formatDateDisplay(startDate)}):</span>
                        <span className="font-mono font-bold text-slate-800">
                          {periodData.isOpeningAdvance
                            ? `(Adv: ${formatPKR(Math.abs(periodData.openingBalance))})`
                            : formatPKR(periodData.openingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Period Purchases:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          +{formatPKR(periodData.periodInvoicesTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Period Payments:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          -{formatPKR(periodData.periodPaymentsTotal)}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
                        <span>Closing Balance:</span>
                        <span
                          className={`font-mono ${
                            periodData.isClosingAdvance ? 'text-emerald-600' : 'text-indigo-700'
                          }`}
                        >
                          {periodData.isClosingAdvance
                            ? `(Adv: ${formatPKR(Math.abs(periodData.closingBalance))})`
                            : formatPKR(periodData.closingBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Two Export Action Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={sharing || isDateRangeInvalid}
                  onClick={() =>
                    handleExportPDF(
                      'mobile',
                      isRange ? startDate : undefined,
                      isRange ? endDate : undefined
                    )
                  }
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Save to Mobile</span>
                </button>

                <button
                  type="button"
                  disabled={sharing || isDateRangeInvalid}
                  onClick={() =>
                    handleExportPDF(
                      'whatsapp',
                      isRange ? startDate : undefined,
                      isRange ? endDate : undefined
                    )
                  }
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
