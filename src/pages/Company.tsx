import React, { useState } from 'react';
import {
  Building2,
  PlusCircle,
  FileText,
  Edit2,
  Trash2,
  Receipt,
  Info,
  Search,
} from 'lucide-react';
import type { PartyInvoice, CompanyPayment } from '../types';
import {
  calculateCompanyBalance,
  formatPKR,
  formatDateDisplay,
} from '../services/accounting';

interface CompanyProps {
  invoices: PartyInvoice[];
  companyPayments: CompanyPayment[];
  onOpenRecordPayment: () => void;
  onEditPayment: (payment: CompanyPayment) => void;
  onDeletePayment: (payment: CompanyPayment) => void;
  onSelectParty: (partyId: string) => void;
}

export const Company: React.FC<CompanyProps> = ({
  invoices,
  companyPayments,
  onOpenRecordPayment,
  onEditPayment,
  onDeletePayment,
  onSelectParty,
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');

  const companyBalance = calculateCompanyBalance(invoices, companyPayments);

  // Filter referenced invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.partyName.toLowerCase().includes(q) ||
      (inv.description && inv.description.toLowerCase().includes(q))
    );
  });

  // Filter company payments
  const filteredPayments = companyPayments.filter((pmt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pmt.paymentMethod.toLowerCase().includes(q) ||
      (pmt.reference && pmt.reference.toLowerCase().includes(q)) ||
      (pmt.note && pmt.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-3.5 pb-20">
      {/* Top Banner Context */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight m-0">
                Login Smart Technology
              </h2>
              <span className="text-[10px] text-indigo-300 font-medium">
                Company Amount Payable Account
              </span>
            </div>
          </div>

          <button
            onClick={onOpenRecordPayment}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Pay Company
          </button>
        </div>

        {/* 3 Primary Balance Cards */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              Amount Payable
            </span>
            <span className="text-xs font-bold text-slate-100 font-mono">
              {formatPKR(companyBalance.totalLiability)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              Total Paid
            </span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {formatPKR(companyBalance.totalPaid)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              Remaining Amount
            </span>
            <span
              className={`text-xs font-extrabold font-mono ${
                companyBalance.isAdvance
                  ? 'text-emerald-400'
                  : companyBalance.outstanding > 0
                  ? 'text-indigo-300'
                  : 'text-slate-300'
              }`}
            >
              {companyBalance.isAdvance
                ? `Adv: ${formatPKR(companyBalance.advanceAmount)}`
                : formatPKR(companyBalance.outstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* Accounting Isolation Notice */}
      <div className="flex items-start p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-xs text-indigo-950">
        <Info className="w-4 h-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
        <span>
          Every company invoice generated for your orders creates an amount payable here. Payments made to the company reduce your amount payable without affecting any party's balance.
        </span>
      </div>

      {/* Sub Tabs: Referenced Invoices vs Company Payments */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Company Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Paid to Company ({companyPayments.length})
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'invoices'
              ? 'Search by party name, invoice #...'
              : 'Search by method, slip receipt #...'
          }
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tab 1: Referenced Invoices List */}
      {activeTab === 'invoices' && (
        <div className="space-y-2">
          {filteredInvoices.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 mb-1">No Invoices Found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto m-0">
                Invoices created in the Parties section will automatically appear here as company amounts payable.
              </p>
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      #{inv.invoiceNumber}
                    </span>
                    <button
                      onClick={() => onSelectParty(inv.partyId)}
                      className="text-xs font-semibold text-sky-700 hover:underline truncate"
                    >
                      {inv.partyName}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                    <span>Date: {formatDateDisplay(inv.date)}</span>
                    {inv.description && (
                      <span className="truncate max-w-[140px]">• {inv.description}</span>
                    )}
                  </div>
                </div>

                <div className="text-right pl-2 shrink-0">
                  <span className="text-xs font-extrabold text-slate-900 font-mono block">
                    {formatPKR(inv.amount)}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-indigo-600">
                    Amount Payable
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Company Payments List */}
      {activeTab === 'payments' && (
        <div className="space-y-2">
          {filteredPayments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 mb-1">No Company Payments Recorded</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
                Record payments made to Login Smart Technology against your orders.
              </p>
              <button
                onClick={onOpenRecordPayment}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Record Payment to Company
              </button>
            </div>
          ) : (
            filteredPayments.map((pmt) => (
              <div
                key={pmt.id}
                className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs flex items-center justify-between hover:border-indigo-200 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-900">
                      Paid via {pmt.paymentMethod}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateDisplay(pmt.date)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                    {pmt.reference && (
                      <div className="font-mono text-slate-600">
                        Slip / Ref: {pmt.reference}
                      </div>
                    )}
                    {pmt.note && <div className="truncate">{pmt.note}</div>}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pl-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 font-mono block">
                      -{formatPKR(pmt.amount)}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400">
                      Paid to Company
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 pl-1">
                    <button
                      onClick={() => onEditPayment(pmt)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeletePayment(pmt)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
