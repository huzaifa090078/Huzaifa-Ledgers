import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  MapPin,
  FileText,
  PlusCircle,
  Download,
  Share2,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  CreditCard,
  BookOpen,
  ListFilter,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import type { Company, PartyInvoice, CompanyInvoice, CompanyPayment } from '../types';
import {
  calculateSingleCompanyBalance,
  calculateCompanyPeriodLedger,
  getCompanyLedgerTimeline,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
} from '../services/accounting';
import { exportCompanyLedgerPDF } from '../services/pdf';
import { shareCompanyLedger } from '../services/share';
import { DateInput } from '../components/common/DateInput';

const getFirstDayOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

interface CompanyDetailProps {
  company: Company;
  invoices: (PartyInvoice | CompanyInvoice)[];
  companyPayments: CompanyPayment[];
  onBack: () => void;
  onOpenAddInvoice: (companyId: string) => void;
  onOpenRecordPayment: (companyId: string) => void;
  onEditInvoice: (invoice: PartyInvoice | CompanyInvoice) => void;
  onDeleteInvoice: (invoice: PartyInvoice | CompanyInvoice) => void;
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
  // Main view: 'ledger' (View Ledger statement) vs 'transactions' (Invoices & Payments management lists)
  const [mainView, setMainView] = useState<'ledger' | 'transactions'>('ledger');
  const [txSubTab, setTxSubTab] = useState<'invoices' | 'payments'>('invoices');

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

  // Filter company-specific invoices & payments for Transaction list
  const companyInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.companyId === company.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, company.id]);

  const companyPaymentsList = useMemo(() => {
    return companyPayments
      .filter((pmt) => pmt.companyId === company.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [companyPayments, company.id]);

  // Chronological accounting ledger timeline with running balance
  const timeline = useMemo(() => {
    return getCompanyLedgerTimeline(company.id, invoices, companyPayments);
  }, [company.id, invoices, companyPayments]);

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
              <span>Back to Companies</span>
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                Company / Supplier Record
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

            {/* Current Balance / Pending Amount */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                {balanceInfo.isAdvance ? 'Advance Balance' : 'Pending Balance'}
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
              Total Invoices / Debit ({companyInvoices.length})
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {formatPKR(balanceInfo.totalInvoices)}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Payments / Credit ({companyPaymentsList.length})
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
            onClick={handleNormalShareWhatsApp}
            disabled={sharing}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 border border-emerald-200/70 transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-emerald-700 mb-1" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </button>
        </div>

        {shareFeedback && (
          <div className="mx-3 mb-3 p-2 text-xs bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 flex items-center justify-between">
            <span>{shareFeedback}</span>
            <button
              onClick={() => setShareFeedback(null)}
              className="text-indigo-600 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Main View Mode Selector: View Ledger vs Transactions */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setMainView('ledger')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition ${
            mainView === 'ledger'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>View Ledger</span>
        </button>
        <button
          type="button"
          onClick={() => setMainView('transactions')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition ${
            mainView === 'transactions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Transactions ({companyInvoices.length + companyPaymentsList.length})</span>
        </button>
      </div>

      {/* --- SECTION A: VIEW LEDGER (FULL RUNNING ACCOUNTING STATEMENT) --- */}
      {mainView === 'ledger' && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chronological Accounting Ledger</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {timeline.entries.length} entries
            </span>
          </div>

          {timeline.entries.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700 mb-1">Company Ledger is Empty</h4>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                No invoices or payments have been recorded for {company.name} yet.
              </p>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => onOpenAddInvoice(company.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700"
                >
                  + Add Invoice
                </button>
                <button
                  onClick={() => onOpenRecordPayment(company.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700"
                >
                  + Record Payment
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.entries.map((entry) => {
                const isInvoice = entry.type === 'invoice';

                return (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className={`bg-white rounded-xl border p-3.5 shadow-2xs transition ${
                      isInvoice
                        ? 'border-indigo-100 hover:border-indigo-200'
                        : 'border-emerald-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isInvoice
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isInvoice ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="text-xs font-bold text-slate-900">
                              {isInvoice
                                ? `Invoice #${entry.invoiceNumber}`
                                : `Payment - ${entry.paymentMethod || 'Cash'}`}
                            </span>
                            {entry.partyName && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-sky-50 text-sky-700 rounded-md border border-sky-100">
                                Party: {entry.partyName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDateDisplay(entry.date)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5 m-0 leading-tight">
                            {entry.description}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => {
                            if (isInvoice) onEditInvoice(entry.rawItem as any);
                            else onEditPayment(entry.rawItem as any);
                          }}
                          title="Edit Entry"
                          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (isInvoice) onDeleteInvoice(entry.rawItem as any);
                            else onDeletePayment(entry.rawItem as any);
                          }}
                          title="Delete Entry"
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Ledger Numbers Grid: Amount Added (Debit) / Payment (Credit) / Balance */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                          Invoice / Debit (+)
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            entry.debit > 0 ? 'text-indigo-700' : 'text-slate-300'
                          }`}
                        >
                          {entry.debit > 0 ? formatPKR(entry.debit) : '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                          Payment / Credit (-)
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            entry.credit > 0 ? 'text-emerald-700' : 'text-slate-300'
                          }`}
                        >
                          {entry.credit > 0 ? formatPKR(entry.credit) : '-'}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-md py-0.5">
                        <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                          Running Balance
                        </span>
                        <span
                          className={`font-mono font-extrabold ${
                            entry.balance > 0
                              ? 'text-indigo-700'
                              : entry.balance < 0
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {entry.balance < 0
                            ? `(Adv: ${formatPKR(Math.abs(entry.balance))})`
                            : formatPKR(entry.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Final Running Balance Banner */}
              <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xs">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                  FINAL COMPANY BALANCE:
                </span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    balanceInfo.isAdvance
                      ? 'text-emerald-400'
                      : balanceInfo.currentBalance > 0
                      ? 'text-indigo-300'
                      : 'text-slate-200'
                  }`}
                >
                  {balanceInfo.isAdvance
                    ? `Advance: ${formatPKR(balanceInfo.advanceAmount)}`
                    : formatPKR(balanceInfo.currentBalance)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SECTION B: TRANSACTIONS (INVOICES & PAYMENTS TABS) --- */}
      {mainView === 'transactions' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Sub-Tabs: Invoices vs Payments */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTxSubTab('invoices')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 ${
                txSubTab === 'invoices'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices ({companyInvoices.length})</span>
            </button>

            <button
              onClick={() => setTxSubTab('payments')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 ${
                txSubTab === 'payments'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments ({companyPaymentsList.length})</span>
            </button>
          </div>

          {/* TAB 1 — INVOICES LIST */}
          {txSubTab === 'invoices' && (
            <div className="space-y-2">
              {companyInvoices.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700 mb-1">No Invoices Found</h4>
                  <p className="text-[11px] text-slate-400 mb-3 max-w-xs mx-auto">
                    No invoices recorded for {company.name} yet.
                  </p>
                  <button
                    onClick={() => onOpenAddInvoice(company.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700"
                  >
                    + Create First Invoice
                  </button>
                </div>
              ) : (
                companyInvoices.map((inv) => {
                  const partyDisplayName = (inv as any).partyName || 'Customer / Party';
                  return (
                    <div
                      key={inv.id}
                      className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-indigo-200 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {partyDisplayName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              #{inv.invoiceNumber}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                            <span>{formatDateDisplay(inv.date)}</span>
                            {inv.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[160px] font-sans">{inv.description}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Amount
                          </span>
                          <div className="text-sm font-black font-mono text-indigo-700">
                            {formatPKR(inv.amount)}
                          </div>

                          <div className="flex items-center justify-end space-x-1 mt-2">
                            <button
                              onClick={() => onEditInvoice(inv)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                              title="Edit Invoice"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteInvoice(inv)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2 — PAYMENTS LIST */}
          {txSubTab === 'payments' && (
            <div className="space-y-2">
              {companyPaymentsList.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700 mb-1">No Payments Found</h4>
                  <p className="text-[11px] text-slate-400 mb-3 max-w-xs mx-auto">
                    No payments recorded for {company.name} yet.
                  </p>
                  <button
                    onClick={() => onOpenRecordPayment(company.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700"
                  >
                    + Record First Payment
                  </button>
                </div>
              ) : (
                companyPaymentsList.map((pmt) => {
                  const method = pmt.paymentMethod || 'Cash';
                  return (
                    <div
                      key={pmt.id}
                      className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-emerald-200 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              Payment ({method})
                            </span>
                            {pmt.reference && (
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                Ref: {pmt.reference}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                            <span>{formatDateDisplay(pmt.date)}</span>
                            {pmt.reference && (
                              <>
                                <span>•</span>
                                <span className="font-mono">Ref: {pmt.reference}</span>
                              </>
                            )}
                            {(pmt as any).note && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px] font-sans">{(pmt as any).note}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Amount
                          </span>
                          <div className="text-sm font-black font-mono text-emerald-700">
                            {formatPKR(pmt.amount)}
                          </div>

                          <div className="flex items-center justify-end space-x-1 mt-2">
                            <button
                              onClick={() => onEditPayment(pmt)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100"
                              title="Edit Payment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePayment(pmt)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF Export & Date Range Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 m-0">
                  Export Company PDF Report
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Report Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportMode('full')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      exportMode === 'full'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Full Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('range')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      exportMode === 'range'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Date Range
                  </button>
                </div>
              </div>

              {exportMode === 'range' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <DateInput
                        label="From Date"
                        value={startDate}
                        onChange={setStartDate}
                        align="left"
                      />
                    </div>
                    <div>
                      <DateInput
                        label="To Date"
                        value={endDate}
                        onChange={setEndDate}
                        align="right"
                      />
                    </div>
                  </div>

                  {isDateRangeInvalid && (
                    <p className="text-[11px] text-red-600 font-medium m-0">
                      Start date must be before end date.
                    </p>
                  )}

                  {periodData && !isDateRangeInvalid && (
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Opening Balance:</span>
                        <span className="font-mono font-semibold">
                          {formatPKR(periodData.openingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Closing Balance:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {formatPKR(periodData.closingBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleExportPDF(
                      'mobile',
                      exportMode === 'range' ? startDate : undefined,
                      exportMode === 'range' ? endDate : undefined
                    )
                  }
                  disabled={isDateRangeInvalid || sharing}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save to Mobile</span>
                </button>

                <button
                  onClick={() =>
                    handleExportPDF(
                      'whatsapp',
                      exportMode === 'range' ? startDate : undefined,
                      exportMode === 'range' ? endDate : undefined
                    )
                  }
                  disabled={isDateRangeInvalid || sharing}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
