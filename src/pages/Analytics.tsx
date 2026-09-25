import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Building2,
  Users,
  SlidersHorizontal,
  ChevronRight,
  Scale,
} from 'lucide-react';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment, Company, CompanyInvoice, DateFilterType } from '../types';
import {
  calculateAnalytics,
  calculatePartyBalance,
  formatPKR,
  formatDateDisplay,
} from '../services/accounting';
import { DateInput } from '../components/common/DateInput';

interface AnalyticsProps {
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  companyPayments: CompanyPayment[];
  companies?: Company[];
  companyInvoices?: CompanyInvoice[];
  onSelectParty: (partyId: string) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  parties,
  invoices,
  partyPayments,
  companyPayments,
  companies = [],
  companyInvoices = [],
  onSelectParty,
}) => {
  const [period, setPeriod] = useState<DateFilterType>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [partySortBy, setPartySortBy] = useState<'highest' | 'lowest' | 'name'>('highest');

  const analytics = useMemo(() => {
    return calculateAnalytics(
      parties,
      invoices,
      partyPayments,
      companyPayments,
      period,
      customStart,
      customEnd,
      companies,
      companyInvoices
    );
  }, [parties, invoices, partyPayments, companyPayments, period, customStart, customEnd, companies, companyInvoices]);

  // Party-wise outstanding balances
  const partyList = useMemo(() => {
    const list = parties.map((party) => {
      const balance = calculatePartyBalance(party.id, invoices, partyPayments);
      const partyInvoices = invoices.filter((i) => i.partyId === party.id);
      const partyPmts = partyPayments.filter((p) => p.partyId === party.id);

      // Find most recent transaction date
      const dates = [...partyInvoices.map((i) => i.date), ...partyPmts.map((p) => p.date)].sort();
      const lastActivity = dates.length > 0 ? dates[dates.length - 1] : undefined;

      return {
        party,
        balance,
        lastActivity,
      };
    });

    if (partySortBy === 'highest') {
      list.sort((a, b) => b.balance.currentBalance - a.balance.currentBalance);
    } else if (partySortBy === 'lowest') {
      list.sort((a, b) => a.balance.currentBalance - b.balance.currentBalance);
    } else {
      list.sort((a, b) => a.party.name.localeCompare(b.party.name));
    }

    return list;
  }, [parties, invoices, partyPayments, partySortBy]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Period Filter Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
              Period Filter
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Active Parties: {parties.length}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-4 gap-1 text-xs">
          <button
            onClick={() => setPeriod('all')}
            className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
              period === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setPeriod('today')}
            className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
              period === 'today'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('this_week')}
            className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
              period === 'this_week'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('this_month')}
            className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
              period === 'this_month'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            This Month
          </button>
        </div>

        {/* Custom Range Option */}
        <div className="pt-1">
          <button
            onClick={() => setPeriod(period === 'custom' ? 'all' : 'custom')}
            className="text-[11px] text-sky-600 font-semibold flex items-center hover:underline"
          >
            <Calendar className="w-3 h-3 mr-1" />
            {period === 'custom' ? 'Hide Custom Dates' : 'Select Custom Date Range'}
          </button>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
              <div>
                <DateInput
                  label="From Date"
                  value={customStart}
                  onChange={setCustomStart}
                />
              </div>
              <div>
                <DateInput
                  label="To Date"
                  value={customEnd}
                  onChange={setCustomEnd}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERALL POSITION CARD */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2 mb-1">
          <Scale className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
            Overall Salesman Position
          </span>
        </div>
        <div className="text-xs text-slate-400 mb-2">
          Net Difference (Total Amount Due − Amount Payable)
        </div>

        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
          <div>
            <div className="text-xl font-black font-mono tracking-tight text-white">
              {formatPKR(analytics.netOutstandingDifference)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Net difference between Amount Due and Amount Payable
            </span>
          </div>
          <div className="text-right text-[11px] font-mono">
            <span className="text-red-400 block">
              Amount Due: {formatPKR(analytics.marketReceivable)}
            </span>
            <span className="text-indigo-300 block">
              Payable: {formatPKR(analytics.companyOutstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* MARKET SECTION */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
              Market Financials
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Shops & Parties</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-50/60 p-2 rounded-lg border border-red-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Amount Due
            </span>
            <span className="text-xs font-bold text-red-600 font-mono">
              {formatPKR(analytics.marketReceivable)}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Total Invoiced
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              {formatPKR(analytics.marketInvoiced)}
            </span>
          </div>

          <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Recovered
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              {formatPKR(analytics.marketRecovered)}
            </span>
          </div>
        </div>
      </div>

      {/* COMPANY SECTION */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
              Companies / Suppliers Position
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Company Account</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Total Invoices
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              {formatPKR(analytics.companyLiability)}
            </span>
          </div>

          <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Paid to Co.
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              {formatPKR(analytics.companyPaid)}
            </span>
          </div>

          <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
            <span className="text-[9px] uppercase font-semibold text-slate-500 block">
              Remaining Amount
            </span>
            <span className="text-xs font-bold text-indigo-700 font-mono">
              {formatPKR(analytics.companyOutstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* TRANSACTION ACTIVITY COUNTS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Activity Counters
        </span>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Parties</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {analytics.activePartiesCount}
            </span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Invoices</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {analytics.invoicesCount}
            </span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Recoveries</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {analytics.partyPaymentsCount}
            </span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 block">Co. Deposits</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {analytics.companyPaymentsCount}
            </span>
          </div>
        </div>
      </div>

      {/* PARTY-WISE OUTSTANDING / REMAINING AMOUNT ANALYTICS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
              Party-wise Remaining Amount
            </h3>
            <p className="text-[10px] text-slate-400 m-0">
              Financial breakdown per customer party
            </p>
          </div>

          <div className="flex items-center space-x-1">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={partySortBy}
              onChange={(e) => setPartySortBy(e.target.value as any)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-hidden"
            >
              <option value="highest">Highest Remaining Amount</option>
              <option value="lowest">Lowest Remaining Amount</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {partyList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No parties available.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {partyList.map(({ party, balance, lastActivity }) => (
              <div
                key={party.id}
                onClick={() => onSelectParty(party.id)}
                className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {party.name}
                  </span>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                    {party.phone && <span>{party.phone}</span>}
                    {lastActivity && <span>• Activity: {formatDateDisplay(lastActivity)}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pl-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs font-extrabold font-mono block ${
                        balance.isAdvance
                          ? 'text-emerald-600'
                          : balance.currentBalance > 0
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {balance.isAdvance
                        ? `(Adv: ${formatPKR(balance.advanceAmount)})`
                        : formatPKR(balance.currentBalance)}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400">
                      {balance.isAdvance ? 'Advance' : 'Due'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
