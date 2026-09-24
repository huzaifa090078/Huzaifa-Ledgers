import React, { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Phone,
  ArrowRight,
  Edit2,
  Trash2,
  Building2,
} from 'lucide-react';
import type { Company as CompanyType, CompanyInvoice, CompanyPayment } from '../types';
import { calculateSingleCompanyBalance, formatPKR } from '../services/accounting';

interface CompanyProps {
  companies: CompanyType[];
  companyInvoices: CompanyInvoice[];
  companyPayments: CompanyPayment[];
  onOpenAddCompany: () => void;
  onEditCompany: (company: CompanyType) => void;
  onDeleteCompany: (company: CompanyType, hasTransactions: boolean) => void;
  onSelectCompany: (companyId: string) => void;
  onQuickAddInvoice: (companyId: string) => void;
  onQuickRecordPayment: (companyId: string) => void;
}

export const Company: React.FC<CompanyProps> = ({
  companies,
  companyInvoices,
  companyPayments,
  onOpenAddCompany,
  onEditCompany,
  onDeleteCompany,
  onSelectCompany,
  onQuickAddInvoice,
  onQuickRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'outstanding' | 'cleared' | 'advance'>('all');

  // Compute balance summaries for each company
  const companyCards = useMemo(() => {
    return companies.map((company) => {
      const balance = calculateSingleCompanyBalance(company.id, companyInvoices, companyPayments);
      const invoicesList = companyInvoices.filter((inv) => inv.companyId === company.id);
      const invoiceNumbers = invoicesList.map((inv) => inv.invoiceNumber.toLowerCase());
      const hasTransactions =
        invoicesList.length > 0 ||
        companyPayments.some((pmt) => pmt.companyId === company.id);

      return {
        company,
        balance,
        invoiceNumbers,
        hasTransactions,
      };
    });
  }, [companies, companyInvoices, companyPayments]);

  // Filter and search
  const filteredCompanyCards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return companyCards.filter(({ company, balance, invoiceNumbers }) => {
      // Balance filter
      if (activeFilter === 'outstanding' && balance.currentBalance <= 0) return false;
      if (activeFilter === 'cleared' && (balance.currentBalance !== 0 || balance.isAdvance)) return false;
      if (activeFilter === 'advance' && !balance.isAdvance) return false;

      // Search query (Company name, Phone, or Invoice number)
      if (!q) return true;
      const matchName = company.name.toLowerCase().includes(q);
      const matchPhone = company.phone ? company.phone.includes(q) : false;
      const matchInvoice = invoiceNumbers.some((num) => num.includes(q));

      return matchName || matchPhone || matchInvoice;
    });
  }, [companyCards, searchQuery, activeFilter]);

  const totalPayable = companyCards.reduce((sum, item) => sum + item.balance.currentBalance, 0);

  return (
    <div className="space-y-3.5 pb-20">
      {/* Top Controls: Search Bar & Add Company Button */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, phone, or bill #..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
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
          onClick={onOpenAddCompany}
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition shrink-0"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Add Company
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
            All ({companies.length})
          </button>
          <button
            onClick={() => setActiveFilter('outstanding')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'outstanding'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Due ({companyCards.filter((c) => c.balance.currentBalance > 0).length})
          </button>
          <button
            onClick={() => setActiveFilter('cleared')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'cleared'
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Nil ({companyCards.filter((c) => c.balance.currentBalance === 0 && !c.balance.isAdvance).length})
          </button>
          <button
            onClick={() => setActiveFilter('advance')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              activeFilter === 'advance'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Adv ({companyCards.filter((c) => c.balance.isAdvance).length})
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap ml-2">
          Total Payable: <span className="text-indigo-600 font-bold">{formatPKR(totalPayable)}</span>
        </span>
      </div>

      {/* Companies Cards List */}
      {filteredCompanyCards.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700 mb-1">No Companies Found</h4>
          <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
            {searchQuery
              ? `No company matches "${searchQuery}". Try another search term.`
              : 'Add your companies or suppliers to begin maintaining their purchase & payment ledger.'}
          </p>
          <button
            onClick={onOpenAddCompany}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Add New Company
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCompanyCards.map(({ company, balance, hasTransactions }) => (
            <div
              key={company.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
            >
              <div className="p-3.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3
                        onClick={() => onSelectCompany(company.id)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate m-0"
                      >
                        {company.name}
                      </h3>
                    </div>

                    {company.phone && (
                      <div className="flex items-center space-x-1 text-slate-500 text-[11px] mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <a
                          href={`tel:${company.phone}`}
                          className="hover:text-indigo-600 font-mono"
                        >
                          {company.phone}
                        </a>
                      </div>
                    )}

                    {company.address && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 m-0">
                        {company.address}
                      </p>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="text-right pl-3">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {balance.isAdvance ? 'Advance Balance' : 'Pending Balance'}
                    </span>
                    <div
                      className={`text-sm font-extrabold font-mono ${
                        balance.isAdvance
                          ? 'text-emerald-600'
                          : balance.currentBalance > 0
                          ? 'text-indigo-600'
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
                      onClick={() => onQuickAddInvoice(company.id)}
                      title="Add Purchase Invoice"
                      className="px-2 py-1 text-[10px] font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200/60 transition"
                    >
                      + Invoice
                    </button>
                    <button
                      onClick={() => onQuickRecordPayment(company.id)}
                      title="Record Payment"
                      className="px-2 py-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200/60 transition"
                    >
                      + Payment
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditCompany(company)}
                      title="Edit Company"
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteCompany(company, hasTransactions)}
                      title="Delete Company"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectCompany(company.id)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                    >
                      <span>View</span>
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
