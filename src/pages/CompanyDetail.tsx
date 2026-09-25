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
  Calendar,
} from 'lucide-react';
import type { Company, PartyInvoice, CompanyInvoice, PartyPayment, CompanyPayment } from '../types';
import {
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

interface CompanyDetailProps {
  company: Company;
  invoices: (PartyInvoice | CompanyInvoice)[];
  partyPayments: (PartyPayment | CompanyPayment)[];
  onBack: () => void;
  onOpenAddInvoice: (companyId: string) => void;
  onOpenRecordPayment: (companyId: string) => void;
  onEditInvoice: (invoice: PartyInvoice | CompanyInvoice) => void;
  onDeleteInvoice: (invoice: PartyInvoice | CompanyInvoice) => void;
  onEditPayment: (payment: PartyPayment | CompanyPayment) => void;
  onDeletePayment: (payment: PartyPayment | CompanyPayment) => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  company,
  invoices,
  partyPayments,
  onBack,
  onOpenAddInvoice,
  onOpenRecordPayment,
  onEditInvoice,
  onDeleteInvoice,
  onEditPayment,
  onDeletePayment,
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
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

  // Filter company-specific invoices & payments
  const companyInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.companyId === company.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, company.id]);

  const companyPaymentsList = useMemo(() => {
    return partyPayments
      .filter((pmt) => pmt.companyId === company.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [partyPayments, company.id]);

  const balanceInfo = calculateSingleCompanyBalance(company.id, invoices, partyPayments);

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
        partyPayments,
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
      const res = await shareCompanyLedger(company, invoices, partyPayments);
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
    ? calculateCompanyPeriodLedger(company.id, invoices, partyPayments, startDate, endDate)
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
              Total Invoices ({companyInvoices.length})
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {formatPKR(balanceInfo.totalInvoices)}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Payments ({companyPaymentsList.length})
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

      {/* Two Main Tabs: TAB 1 — INVOICES & TAB 2 — PAYMENTS */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'invoices'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoices ({companyInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'payments'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments ({companyPaymentsList.length})</span>
        </button>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="space-y-2.5">
          {companyInvoices.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700 mb-1">No Invoices for this Company</h4>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                Create an invoice linked to a party to record transactions under {company.name}.
              </p>
              <button
                onClick={() => onOpenAddInvoice(company.id)}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Add First Invoice
              </button>
            </div>
          ) : (
            companyInvoices.map((inv) => {
              const partyName = (inv as PartyInvoice).partyName || (inv as CompanyInvoice).partyName || 'Party';
              return (
                <div
                  key={inv.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg shrink-0 bg-indigo-50 text-indigo-700 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Party Name Header */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {partyName}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-800 font-mono">
                            #{inv.invoiceNumber}
                          </span>
                        </div>

                        {/* Date & Details */}
                        <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateDisplay(inv.date)}</span>
                        </div>

                        {inv.description && (
                          <p className="text-[11px] text-slate-600 mt-1 truncate m-0">
                            {inv.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Invoice Amount
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

      {/* TAB 2: PAYMENTS LIST */}
      {activeTab === 'payments' && (
        <div className="space-y-2.5">
          {companyPaymentsList.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700 mb-1">No Payments Recorded</h4>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                Record party payments received for {company.name}.
              </p>
              <button
                onClick={() => onOpenRecordPayment(company.id)}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Record First Payment
              </button>
            </div>
          ) : (
            companyPaymentsList.map((pmt) => {
              const partyName = (pmt as PartyPayment).partyName || (pmt as CompanyPayment).partyName || 'Party';
              return (
                <div
                  key={pmt.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg shrink-0 bg-emerald-50 text-emerald-700 mt-0.5">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Party Name */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {partyName}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                            {pmt.paymentMethod}
                          </span>
                        </div>

                        {/* Date & Ref */}
                        <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateDisplay(pmt.date)}</span>
                          {pmt.reference && (
                            <span className="text-slate-400">
                              • Ref: {pmt.reference}
                            </span>
                          )}
                        </div>

                        {pmt.note && (
                          <p className="text-[11px] text-slate-600 mt-1 truncate m-0">
                            {pmt.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Amount Paid
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

      {/* PDF Export Modal */}
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
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
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
