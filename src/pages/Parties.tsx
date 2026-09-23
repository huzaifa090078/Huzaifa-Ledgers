import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Phone,
  ArrowRight,
  Edit2,
  Trash2,
  Building,
} from 'lucide-react';
import type { Party, PartyInvoice, PartyPayment } from '../types';
import { calculatePartyBalance, formatPKR } from '../services/accounting';

interface PartiesProps {
  parties: Party[];
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  onOpenAddParty: () => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (party: Party, hasTransactions: boolean) => void;
  onSelectParty: (partyId: string) => void;
  onQuickAddInvoice: (partyId: string) => void;
  onQuickRecordPayment: (partyId: string) => void;
}

export const Parties: React.FC<PartiesProps> = ({
  parties,
  invoices,
  partyPayments,
  onOpenAddParty,
  onEditParty,
  onDeleteParty,
  onSelectParty,
  onQuickAddInvoice,
  onQuickRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'outstanding' | 'cleared' | 'advance'>('all');

  // Compute balance summaries for each party
  const partyCards = useMemo(() => {
    return parties.map((party) => {
      const balance = calculatePartyBalance(party.id, invoices, partyPayments);
      const partyInvoicesList = invoices.filter((inv) => inv.partyId === party.id);
      const invoiceNumbers = partyInvoicesList.map((inv) => inv.invoiceNumber.toLowerCase());
      const hasTransactions = partyInvoicesList.length > 0 || partyPayments.some((pmt) => pmt.partyId === party.id);

      return {
        party,
        balance,
        invoiceNumbers,
        hasTransactions,
      };
    });
  }, [parties, invoices, partyPayments]);

  // Filter and search
  const filteredPartyCards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return partyCards.filter(({ party, balance, invoiceNumbers }) => {
      // Balance filter
      if (activeFilter === 'outstanding' && balance.currentBalance <= 0) return false;
      if (activeFilter === 'cleared' && (balance.currentBalance !== 0 || balance.isAdvance)) return false;
      if (activeFilter === 'advance' && !balance.isAdvance) return false;

      // Search query (Party name, Phone, or Invoice number)
      if (!q) return true;
      const matchName = party.name.toLowerCase().includes(q);
      const matchPhone = party.phone ? party.phone.includes(q) : false;
      const matchInvoice = invoiceNumbers.some((num) => num.includes(q));

      return matchName || matchPhone || matchInvoice;
    });
  }, [partyCards, searchQuery, activeFilter]);

  const totalReceivable = partyCards.reduce((sum, item) => sum + item.balance.currentBalance, 0);

  return (
    <div className="space-y-3.5 pb-20">
      {/* Top Controls: Search Bar & Add Party Button */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party, phone, or invoice #..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <button
          onClick={onOpenAddParty}
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add Party
        </button>
      </div>

      {/* Filter Tabs & Quick Count */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({parties.length})
          </button>
          <button
            onClick={() => setActiveFilter('outstanding')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'outstanding'
                ? 'bg-red-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Due ({partyCards.filter((p) => p.balance.currentBalance > 0).length})
          </button>
          <button
            onClick={() => setActiveFilter('cleared')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'cleared'
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Nil ({partyCards.filter((p) => p.balance.currentBalance === 0 && !p.balance.isAdvance).length})
          </button>
          <button
            onClick={() => setActiveFilter('advance')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'advance'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Adv ({partyCards.filter((p) => p.balance.isAdvance).length})
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap ml-2">
          Total Due: <span className="text-red-600 font-bold">{formatPKR(totalReceivable)}</span>
        </span>
      </div>

      {/* Party Cards List */}
      {filteredPartyCards.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700 mb-1">No Parties Found</h4>
          <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
            {searchQuery
              ? `No party matches "${searchQuery}". Try another search term.`
              : 'Add your parties or customers to begin maintaining their ledger records.'}
          </p>
          <button
            onClick={onOpenAddParty}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add New Party
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPartyCards.map(({ party, balance, hasTransactions }) => (
            <div
              key={party.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
            >
                <div className="p-3.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 
                          onClick={() => onSelectParty(party.id)}
                          className="text-sm font-bold text-slate-900 hover:text-sky-600 cursor-pointer truncate m-0"
                        >
                          {party.name}
                        </h3>
                      </div>

                      {party.phone && (
                        <div className="flex items-center space-x-1 text-slate-500 text-[11px] mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a
                            href={`tel:${party.phone}`}
                            className="hover:text-sky-600 font-mono"
                          >
                            {party.phone}
                          </a>
                        </div>
                      )}

                      {party.address && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 m-0">
                          {party.address}
                        </p>
                      )}
                    </div>

                    {/* Balance Display */}
                    <div className="text-right pl-3">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {balance.isAdvance ? 'Advance' : 'Remaining Amount'}
                      </span>
                      <div
                        className={`text-sm font-extrabold font-mono ${
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
                      </div>
                    </div>
                  </div>

                  {/* Actions footer on card */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onQuickAddInvoice(party.id)}
                        title="Add Invoice"
                        className="px-2 py-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200/60 transition"
                      >
                        + Invoice
                      </button>
                      <button
                        onClick={() => onQuickRecordPayment(party.id)}
                        title="Record Payment"
                        className="px-2 py-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200/60 transition"
                      >
                        + Payment
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEditParty(party)}
                        title="Edit Party"
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteParty(party, hasTransactions)}
                        title="Delete Party"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectParty(party.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
                      >
                        <span>View Ledger</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
