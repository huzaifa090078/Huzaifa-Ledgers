import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileText,
  UserPlus,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment, DailyReconciliation } from '../types';
import {
  calculateAnalytics,
  calculateDailyCollection,
  calculateDailyReconciliation,
  getRecentTransactions,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
} from '../services/accounting';

interface DashboardProps {
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  dailyReconciliations?: DailyReconciliation[];
  onOpenAddParty: () => void;
  onOpenAddInvoice?: () => void;
  onOpenRecordPartyPayment?: () => void;
  onOpenRecordCompanyPayment?: () => void;
  onSelectParty: (partyId: string) => void;
  onNavigateToCompany: () => void;
  onNavigateToCollection: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  parties,
  invoices,
  partyPayments,
  companyPayments,
  dailyReconciliations = [],
  onOpenAddParty,
  onSelectParty,
  onNavigateToCompany,
  onNavigateToCollection,
}) => {
  const todayStr = getTodayDateString();
  const analytics = calculateAnalytics(parties, invoices, partyPayments, companyPayments, 'all');
  const recentTransactions = getRecentTransactions(invoices, partyPayments, companyPayments, 15);

  // Daily collection and reconciliation strictly for today
  const todayCollection = calculateDailyCollection(partyPayments, todayStr);
  const todaySavedRecon = dailyReconciliations.find((r) => r.date === todayStr);
  const todayReconciliation = calculateDailyReconciliation(todayCollection, todaySavedRecon, companyPayments);

  return (
    <div className="space-y-4 pb-20">
      {/* 🌟 1. PROMINENT TOP CARD: TODAY'S COLLECTION */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-emerald-600/30">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50 inline-block mb-1">
              Today's Collection
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {formatPKR(todayCollection.totalCollection)}
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-0.5 m-0">
              Total received from party payments today
            </p>
          </div>

          <button
            onClick={onNavigateToCollection}
            className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-emerald-50 active:bg-emerald-100 rounded-xl shadow-xs transition shrink-0"
          >
            View Collection
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-emerald-700" />
          </button>
        </div>

        {/* Small Breakdown: Cash, Bank Account, Easypaisa */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-700/50 text-center">
          <div className="bg-slate-950/40 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-emerald-300 block">Cash</span>
            <span className="text-xs font-bold text-white font-mono">
              {formatPKR(todayCollection.cashCollection)}
            </span>
          </div>

          <div className="bg-slate-950/40 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-sky-300 block">Bank Account</span>
            <span className="text-xs font-bold text-white font-mono">
              {formatPKR(todayCollection.bankCollection)}
            </span>
          </div>

          <div className="bg-slate-950/40 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-amber-300 block">Easypaisa</span>
            <span className="text-xs font-bold text-white font-mono">
              {formatPKR(todayCollection.easypaisaCollection)}
            </span>
          </div>
        </div>

        {/* Balance Check Status Pill */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-300 bg-slate-950/30 px-2.5 py-1 rounded-lg">
          <span>Balance Check:</span>
          <span
            className={`font-bold flex items-center ${
              todayReconciliation.isAllMatched ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {todayReconciliation.isAllMatched ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Matched
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1 text-amber-400" /> Difference: {formatPKR(todayReconciliation.totalDifference)}
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Top Banner Context: Financial Overview */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">
              Login Smart Technology Salesman
            </span>
            <h2 className="text-base font-bold text-white tracking-tight m-0">
              Financial Overview
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Net Difference</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                analytics.netOutstandingDifference >= 0
                  ? 'bg-slate-800 text-sky-300'
                  : 'bg-amber-900/50 text-amber-300'
              }`}
            >
              {formatPKR(analytics.netOutstandingDifference)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 4 Primary Summary Cards (Simple English Terms) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Amount Due */}
        <div className="bg-white p-3.5 rounded-xl border border-red-100 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Amount Due
            </span>
            <span className="p-1 rounded-md bg-red-50 text-red-600">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-red-600 tracking-tight">
            {formatPKR(analytics.marketReceivable)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 m-0">
            From {parties.length} customer parties
          </p>
        </div>

        {/* Total Amount Payable */}
        <div
          onClick={onNavigateToCompany}
          className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs cursor-pointer active:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Amount Payable
            </span>
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <Building2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-700 tracking-tight">
            {formatPKR(analytics.companyOutstanding)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 m-0">
            Due to Login Smart Technology
          </p>
        </div>

        {/* Today's Collection */}
        <div
          onClick={onNavigateToCollection}
          className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs cursor-pointer active:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today's Collection
            </span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-600 tracking-tight">
            {formatPKR(todayCollection.totalCollection)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 m-0">
            Cash: {formatPKR(todayCollection.cashCollection)} • Bank: {formatPKR(todayCollection.bankCollection)}
          </p>
        </div>

        {/* Paid to Company */}
        <div
          onClick={onNavigateToCompany}
          className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs cursor-pointer active:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Paid to Company
            </span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-blue-600 tracking-tight">
            {formatPKR(analytics.todayCompanyPayment)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 m-0">
            Deposited to company today
          </p>
        </div>
      </div>


      {/* 5. Recent Entries Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
            Recent Entries
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {recentTransactions.length} recorded
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 mb-1">No entries recorded yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
              Add parties, invoices, and payments to begin tracking your records.
            </p>
            <button
              onClick={onOpenAddParty}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg shadow-xs hover:bg-sky-700"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Add First Party
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isIncoming = tx.direction === 'incoming';
              const isOutgoing = tx.direction === 'outgoing';
              const linkedParty = parties.find((p) => p.name === tx.title);

              return (
                <div
                  key={tx.id}
                  onClick={() => linkedParty && onSelectParty(linkedParty.id)}
                  className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition ${
                    linkedParty ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isIncoming
                          ? 'bg-emerald-100 text-emerald-700'
                          : isOutgoing
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isIncoming ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isOutgoing ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {tx.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateDisplay(tx.date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate m-0">
                        {tx.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-2 shrink-0">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isIncoming
                          ? 'text-emerald-600'
                          : isOutgoing
                          ? 'text-blue-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {isIncoming ? '+' : isOutgoing ? '-' : ''}
                      {formatPKR(tx.amount)}
                    </div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      {isIncoming ? 'Payment Received' : isOutgoing ? 'Paid to Company' : 'Invoice Added'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
