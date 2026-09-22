import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileDown,
  PlusCircle,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import type { Party, PartyPayment, CompanyPayment, DailyReconciliation } from '../types';
import {
  calculateDailyCollection,
  calculateDailyReconciliation,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
} from '../services/accounting';
import { downloadDailyCollectionPDF } from '../services/pdf';

interface DailyCollectionProps {
  parties: Party[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  dailyReconciliations: DailyReconciliation[];
  onSaveReconciliation: (recon: DailyReconciliation) => Promise<void>;
  onOpenRecordPartyPayment: () => void;
  onSelectParty: (partyId: string) => void;
  salesmanName?: string;
}

export const DailyCollection: React.FC<DailyCollectionProps> = ({
  parties,
  partyPayments,
  companyPayments,
  dailyReconciliations,
  onSaveReconciliation,
  onOpenRecordPartyPayment,
  onSelectParty,
  salesmanName = 'Sales Representative',
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'collection' | 'balance_check' | 'report'>('collection');

  const handleDownloadDailyPDF = async () => {
    try {
      const res = await downloadDailyCollectionPDF(dailyCollection, salesmanName);
      if (res?.message) {
        setPdfFeedback(res.message);
        setTimeout(() => setPdfFeedback(null), 4000);
      }
    } catch (err: any) {
      setPdfFeedback('Failed to download PDF.');
      setTimeout(() => setPdfFeedback(null), 3000);
    }
  };

  // Find saved reconciliation record for selected date
  const savedRecon = useMemo(() => {
    return dailyReconciliations.find((r) => r.date === selectedDate);
  }, [dailyReconciliations, selectedDate]);

  // Local form state initialized from saved record
  const [formData, setFormData] = useState<{
    openingCash: string;
    cashExpenses: string;
    actualCash: string;
    openingBank: string;
    bankWithdrawals: string;
    actualBank: string;
    openingEasypaisa: string;
    easypaisaWithdrawals: string;
    actualEasypaisa: string;
    openingJazzCash: string;
    jazzCashWithdrawals: string;
    actualJazzCash: string;
    notes: string;
  }>({
    openingCash: '',
    cashExpenses: '',
    actualCash: '',
    openingBank: '',
    bankWithdrawals: '',
    actualBank: '',
    openingEasypaisa: '',
    easypaisaWithdrawals: '',
    actualEasypaisa: '',
    openingJazzCash: '',
    jazzCashWithdrawals: '',
    actualJazzCash: '',
    notes: '',
  });

  // Keep form in sync when date changes or savedRecon updates
  React.useEffect(() => {
    if (savedRecon) {
      setFormData({
        openingCash: savedRecon.openingCash ? String(savedRecon.openingCash) : '',
        cashExpenses: savedRecon.cashExpenses ? String(savedRecon.cashExpenses) : '',
        actualCash: savedRecon.actualCash ? String(savedRecon.actualCash) : '',
        openingBank: savedRecon.openingBank ? String(savedRecon.openingBank) : '',
        bankWithdrawals: savedRecon.bankWithdrawals ? String(savedRecon.bankWithdrawals) : '',
        actualBank: savedRecon.actualBank ? String(savedRecon.actualBank) : '',
        openingEasypaisa: savedRecon.openingEasypaisa ? String(savedRecon.openingEasypaisa) : '',
        easypaisaWithdrawals: savedRecon.easypaisaWithdrawals ? String(savedRecon.easypaisaWithdrawals) : '',
        actualEasypaisa: savedRecon.actualEasypaisa ? String(savedRecon.actualEasypaisa) : '',
        openingJazzCash: savedRecon.openingJazzCash ? String(savedRecon.openingJazzCash) : '',
        jazzCashWithdrawals: savedRecon.jazzCashWithdrawals ? String(savedRecon.jazzCashWithdrawals) : '',
        actualJazzCash: savedRecon.actualJazzCash ? String(savedRecon.actualJazzCash) : '',
        notes: savedRecon.notes || '',
      });
    } else {
      setFormData({
        openingCash: '',
        cashExpenses: '',
        actualCash: '',
        openingBank: '',
        bankWithdrawals: '',
        actualBank: '',
        openingEasypaisa: '',
        easypaisaWithdrawals: '',
        actualEasypaisa: '',
        openingJazzCash: '',
        jazzCashWithdrawals: '',
        actualJazzCash: '',
        notes: '',
      });
    }
  }, [selectedDate, savedRecon]);

  // Calculate daily collection directly from actual Party Payments
  const dailyCollection = useMemo(() => {
    return calculateDailyCollection(partyPayments, selectedDate);
  }, [partyPayments, selectedDate]);

  // Calculate reconciliation comparing ledger values with user input
  const reconInputData: Partial<DailyReconciliation> = useMemo(() => {
    return {
      openingCash: Number(formData.openingCash) || 0,
      cashExpenses: Number(formData.cashExpenses) || 0,
      actualCash: Number(formData.actualCash) || 0,
      openingBank: Number(formData.openingBank) || 0,
      bankWithdrawals: Number(formData.bankWithdrawals) || 0,
      actualBank: Number(formData.actualBank) || 0,
      openingEasypaisa: Number(formData.openingEasypaisa) || 0,
      easypaisaWithdrawals: Number(formData.easypaisaWithdrawals) || 0,
      actualEasypaisa: Number(formData.actualEasypaisa) || 0,
      openingJazzCash: Number(formData.openingJazzCash) || 0,
      jazzCashWithdrawals: Number(formData.jazzCashWithdrawals) || 0,
      actualJazzCash: Number(formData.actualJazzCash) || 0,
    };
  }, [formData]);

  const reconciliation = useMemo(() => {
    return calculateDailyReconciliation(dailyCollection, reconInputData, companyPayments);
  }, [dailyCollection, reconInputData, companyPayments]);

  // Persist form changes to Dexie
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    const reconRecord: DailyReconciliation = {
      id: `recon-${selectedDate}`,
      date: selectedDate,
      openingCash: Number(updated.openingCash) || 0,
      cashExpenses: Number(updated.cashExpenses) || 0,
      actualCash: Number(updated.actualCash) || 0,
      openingBank: Number(updated.openingBank) || 0,
      bankWithdrawals: Number(updated.bankWithdrawals) || 0,
      actualBank: Number(updated.actualBank) || 0,
      openingEasypaisa: Number(updated.openingEasypaisa) || 0,
      easypaisaWithdrawals: Number(updated.easypaisaWithdrawals) || 0,
      actualEasypaisa: Number(updated.actualEasypaisa) || 0,
      openingJazzCash: Number(updated.openingJazzCash) || 0,
      jazzCashWithdrawals: Number(updated.jazzCashWithdrawals) || 0,
      actualJazzCash: Number(updated.actualJazzCash) || 0,
      notes: updated.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveReconciliation(reconRecord);
  };

  // Quick date jump helpers
  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const isToday = selectedDate === getTodayDateString();

  return (
    <div className="space-y-3.5 pb-20">
      {/* Date Bar & Controls */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleDateShift(-1)}
              title="Previous Day"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <button
              onClick={() => handleDateShift(1)}
              title="Next Day"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {!isToday && (
              <button
                onClick={() => setSelectedDate(getTodayDateString())}
                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
              >
                Today
              </button>
            )}
            <button
              onClick={handleDownloadDailyPDF}
              title="Daily Collection PDF Download"
              className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              <FileDown className="w-3.5 h-3.5 mr-1 text-slate-600" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {pdfFeedback && (
        <div className="p-3 text-xs bg-sky-50 text-sky-800 rounded-xl border border-sky-200 flex items-center justify-between shadow-2xs">
          <span>{pdfFeedback}</span>
          <button
            onClick={() => setPdfFeedback(null)}
            className="text-sky-600 font-bold ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Prominent Banner: TODAY'S COLLECTION */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 inline-block mb-1.5">
              {isToday ? "Today's Collection" : `Collection for ${formatDateDisplay(selectedDate)}`}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {formatPKR(dailyCollection.totalCollection)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 m-0">
              Total received from party payments
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block mb-0.5">Balance Check Status</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                reconciliation.isAllMatched
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {reconciliation.isAllMatched ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Matched
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1 text-amber-400" /> Difference:{' '}
                  {formatPKR(reconciliation.totalDifference)}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Collection Breakdown Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-slate-800">
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">Cash</span>
            <span className="text-xs font-bold text-emerald-300 font-mono">
              {formatPKR(dailyCollection.cashCollection)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">Bank Account</span>
            <span className="text-xs font-bold text-sky-300 font-mono">
              {formatPKR(dailyCollection.bankCollection)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">Easypaisa</span>
            <span className="text-xs font-bold text-amber-300 font-mono">
              {formatPKR(dailyCollection.easypaisaCollection)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">JazzCash / Other</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              {formatPKR(dailyCollection.jazzCashCollection + dailyCollection.otherCollection)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden px-1">
        <button
          onClick={() => setSubTab('collection')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
            subTab === 'collection'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Party Collection ({dailyCollection.payments.length})
        </button>

        <button
          onClick={() => setSubTab('balance_check')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
            subTab === 'balance_check'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Balance Check
        </button>

        <button
          onClick={() => setSubTab('report')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
            subTab === 'report'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Report
        </button>
      </div>

      {/* SUB-TAB 1: Party-wise Collection List */}
      {subTab === 'collection' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Received Payments List
            </span>
            <button
              onClick={onOpenRecordPartyPayment}
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Record Payment
            </button>
          </div>

          {dailyCollection.payments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 mb-1">
                No party payments received on this date
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
                Record payments received from customer parties to track your daily collection.
              </p>
              <button
                onClick={onOpenRecordPartyPayment}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Record Payment
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {dailyCollection.payments.map((p) => {
                const linkedParty = parties.find((party) => party.id === p.partyId);

                return (
                  <div
                    key={p.id}
                    onClick={() => linkedParty && onSelectParty(linkedParty.id)}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {p.partyName}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            p.paymentMethod === 'Cash'
                              ? 'bg-emerald-50 text-emerald-700'
                              : p.paymentMethod === 'Bank'
                              ? 'bg-sky-50 text-sky-700'
                              : p.paymentMethod === 'Easypaisa'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {p.paymentMethod === 'Bank' ? 'Bank Account' : p.paymentMethod}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                        {p.reference && <span>Ref: {p.reference}</span>}
                        {p.note && <span className="truncate max-w-[150px]">• {p.note}</span>}
                        {p.createdAt && (
                          <span className="flex items-center">
                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                            {p.createdAt.split('T')[1]?.substring(0, 5) || ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right pl-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 font-mono block">
                        +{formatPKR(p.amount)}
                      </span>
                      <span className="text-[9px] uppercase font-semibold text-slate-400">
                        Payment Received
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Total Row */}
              <div className="p-3 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Total Collection</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">
                  {formatPKR(dailyCollection.totalCollection)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Balance Check */}
      {subTab === 'balance_check' && (
        <div className="space-y-3.5">
          {/* Isolation Notice */}
          <div className="flex items-start p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-950">
            <ShieldAlert className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
            <span>
              <strong>Balance Check Rule:</strong> Entering actual balances here does not modify party accounts or company amount payable. If there is a difference, review your recorded entries.
            </span>
          </div>

          {/* 1. Cash Balance Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                Cash Balance Check
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  reconciliation.cash.isMatched
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {reconciliation.cash.isMatched
                  ? 'Matched'
                  : `Difference: ${formatPKR(reconciliation.cash.difference)}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Starting Cash
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.openingCash}
                  onChange={(e) => handleFieldChange('openingCash', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Cash Collection (+)
                </label>
                <div className="px-2 py-1 text-xs bg-emerald-50 text-emerald-800 font-bold rounded font-mono border border-emerald-200">
                  {formatPKR(reconciliation.cash.collection)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Cash Expenses (-)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.cashExpenses}
                  onChange={(e) => handleFieldChange('cashExpenses', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Expected Ending Cash</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {formatPKR(reconciliation.cash.expected)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                  Actual Cash Count
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.actualCash}
                  onChange={(e) => handleFieldChange('actualCash', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-400 rounded font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Bank Account Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <span className="w-2 h-2 rounded-full bg-sky-500 mr-1.5" />
                Bank Account Balance Check
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  reconciliation.bank.isMatched
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {reconciliation.bank.isMatched
                  ? 'Matched'
                  : `Difference: ${formatPKR(reconciliation.bank.difference)}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Starting Bank
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.openingBank}
                  onChange={(e) => handleFieldChange('openingBank', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Bank Collection (+)
                </label>
                <div className="px-2 py-1 text-xs bg-sky-50 text-sky-800 font-bold rounded font-mono border border-sky-200">
                  {formatPKR(reconciliation.bank.collection)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Bank Payments/Withdrawals (-)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.bankWithdrawals}
                  onChange={(e) => handleFieldChange('bankWithdrawals', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Expected Ending Bank</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {formatPKR(reconciliation.bank.expected)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                  Actual Bank Balance
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.actualBank}
                  onChange={(e) => handleFieldChange('actualBank', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-400 rounded font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Easypaisa Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                Easypaisa Balance Check
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  reconciliation.easypaisa.isMatched
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {reconciliation.easypaisa.isMatched
                  ? 'Matched'
                  : `Difference: ${formatPKR(reconciliation.easypaisa.difference)}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Starting Balance
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.openingEasypaisa}
                  onChange={(e) => handleFieldChange('openingEasypaisa', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Collection (+)
                </label>
                <div className="px-2 py-1 text-xs bg-amber-50 text-amber-800 font-bold rounded font-mono border border-amber-200">
                  {formatPKR(reconciliation.easypaisa.collection)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Payments/Withdrawals (-)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.easypaisaWithdrawals}
                  onChange={(e) => handleFieldChange('easypaisaWithdrawals', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Expected Ending Balance</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {formatPKR(reconciliation.easypaisa.expected)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                  Actual Balance
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.actualEasypaisa}
                  onChange={(e) => handleFieldChange('actualEasypaisa', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-400 rounded font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Daily Report */}
      {subTab === 'report' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Daily Summary Report</h3>
              <span className="text-xs text-slate-400 font-mono">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
            <button
              onClick={handleDownloadDailyPDF}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
            >
              <FileDown className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Download PDF Report
            </button>
          </div>

          {/* Key Metrics Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total Party Collection</span>
              <span className="font-bold text-emerald-600 font-mono">
                {formatPKR(dailyCollection.totalCollection)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 pl-3 text-slate-500">
              <span>• Cash Collection</span>
              <span className="font-mono">{formatPKR(dailyCollection.cashCollection)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 pl-3 text-slate-500">
              <span>• Bank Collection</span>
              <span className="font-mono">{formatPKR(dailyCollection.bankCollection)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 pl-3 text-slate-500">
              <span>• Easypaisa Collection</span>
              <span className="font-mono">{formatPKR(dailyCollection.easypaisaCollection)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 pl-3 text-slate-500">
              <span>• JazzCash / Other</span>
              <span className="font-mono">
                {formatPKR(dailyCollection.jazzCashCollection + dailyCollection.otherCollection)}
              </span>
            </div>

            {/* Strict Company Separation */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 bg-indigo-50/50 px-2 rounded">
              <span className="text-indigo-900 font-semibold flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Paid to Company (Smart Technology)
              </span>
              <span className="font-bold text-indigo-700 font-mono">
                {formatPKR(reconciliation.todayCompanyPayment)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Cash Expenses</span>
              <span className="font-mono text-slate-800">
                {formatPKR(Number(formData.cashExpenses) || 0)}
              </span>
            </div>

            {/* Balance Check Metrics */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Expected Ending Cash</span>
              <span className="font-mono text-slate-800">
                {formatPKR(reconciliation.cash.expected)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Actual Cash Count</span>
              <span className="font-bold font-mono text-slate-900">
                {formatPKR(reconciliation.cash.actual)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Cash Difference</span>
              <span
                className={`font-bold font-mono ${
                  reconciliation.cash.isMatched ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {formatPKR(reconciliation.cash.difference)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 bg-slate-50 px-2.5 rounded-lg mt-3">
              <span className="font-bold text-slate-800">Overall Balance Check Status</span>
              <span
                className={`font-bold text-xs ${
                  reconciliation.isAllMatched ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {reconciliation.isAllMatched
                  ? 'Matched'
                  : `Difference: ${formatPKR(reconciliation.totalDifference)}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
