import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, CheckCircle2, Building2, User, Search, Check } from 'lucide-react';
import type { Party, Company, PartyInvoice, PartyPayment, PartyPaymentMethod } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR } from '../../services/accounting';
import { DateInput } from '../common/DateInput';

interface RecordPartyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: PartyPayment) => Promise<void>;
  parties: Party[];
  companies?: Company[];
  invoices?: PartyInvoice[];
  defaultPartyId?: string;
  defaultCompanyId?: string;
  editingPayment?: PartyPayment | null;
}

const PAYMENT_METHODS: PartyPaymentMethod[] = ['Cash', 'Bank', 'Easypaisa', 'JazzCash', 'Other'];

export const RecordPartyPaymentModal: React.FC<RecordPartyPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  parties,
  companies = [],
  invoices = [],
  defaultPartyId,
  defaultCompanyId,
  editingPayment,
}) => {
  const [partyId, setPartyId] = useState(defaultPartyId || '');
  const [partySearch, setPartySearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [invoiceId, setInvoiceId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PartyPaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Find relevant companies for selected party based on invoices
  const relevantCompanies = useMemo(() => {
    if (!partyId) return companies;
    const partyInvoices = invoices.filter((i) => i.partyId === partyId && i.companyId);
    const partyCompanyIds = new Set(partyInvoices.map((i) => i.companyId));
    if (partyCompanyIds.size > 0) {
      return companies.filter((c) => partyCompanyIds.has(c.id));
    }
    return companies;
  }, [partyId, invoices, companies]);

  // Find invoices for selected party and company
  const relevantInvoices = useMemo(() => {
    if (!partyId) return [];
    return invoices.filter(
      (inv) => inv.partyId === partyId && (!companyId || inv.companyId === companyId)
    );
  }, [partyId, companyId, invoices]);

  useEffect(() => {
    if (editingPayment) {
      setPartyId(editingPayment.partyId);
      const foundParty = parties.find((p) => p.id === editingPayment.partyId);
      setPartySearch(foundParty ? foundParty.name : editingPayment.partyName);
      setCompanyId(editingPayment.companyId || defaultCompanyId || '');
      setInvoiceId(editingPayment.invoiceId || '');
      setDate(editingPayment.date);
      setAmount(String(editingPayment.amount));
      setPaymentMethod(editingPayment.paymentMethod);
      setReference(editingPayment.reference || '');
      setNote(editingPayment.note || '');
    } else {
      const initialPartyId = defaultPartyId || '';
      setPartyId(initialPartyId);
      const foundParty = parties.find((p) => p.id === initialPartyId);
      setPartySearch(foundParty ? foundParty.name : '');

      // Auto select company if known or single
      let initialCompId = defaultCompanyId || '';
      if (!initialCompId) {
        if (relevantCompanies.length === 1) {
          initialCompId = relevantCompanies[0].id;
        } else if (companies.length === 1) {
          initialCompId = companies[0].id;
        }
      }
      setCompanyId(initialCompId);
      setInvoiceId('');
      setDate(getTodayDateString());
      setAmount('');
      setPaymentMethod('Cash');
      setReference('');
      setNote('');
    }
    setIsPartyDropdownOpen(false);
    setError('');
  }, [editingPayment, defaultPartyId, defaultCompanyId, parties, companies, relevantCompanies, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    if (isPartyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPartyDropdownOpen]);

  // When party changes, auto-adjust company if only 1 exists
  const handlePartyChange = (newPartyId: string) => {
    setPartyId(newPartyId);
    setInvoiceId('');
    const partyInvoices = invoices.filter((i) => i.partyId === newPartyId && i.companyId);
    const partyCompanyIds = Array.from(new Set(partyInvoices.map((i) => i.companyId as string)));
    if (partyCompanyIds.length === 1) {
      setCompanyId(partyCompanyIds[0]);
    } else if (partyCompanyIds.length === 0 && companies.length === 1) {
      setCompanyId(companies[0].id);
    }
  };

  // Filter parties by search query
  const filteredParties = useMemo(() => {
    const query = partySearch.trim().toLowerCase();
    if (!query) return parties;
    return parties.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const phoneMatch = p.phone ? p.phone.toLowerCase().includes(query) : false;
      return nameMatch || phoneMatch;
    });
  }, [parties, partySearch]);

  const handleSelectParty = (p: Party) => {
    handlePartyChange(p.id);
    setPartySearch(p.name);
    setIsPartyDropdownOpen(false);
    setError('');
  };

  const handleClearParty = () => {
    setPartyId('');
    setPartySearch('');
    setIsPartyDropdownOpen(true);
  };

  // When invoice is chosen, auto set company
  const handleInvoiceChange = (newInvoiceId: string) => {
    setInvoiceId(newInvoiceId);
    if (newInvoiceId) {
      const inv = invoices.find((i) => i.id === newInvoiceId);
      if (inv && inv.companyId) {
        setCompanyId(inv.companyId);
      }
    }
  };

  // Listen to Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    const handleAppBack = (e: Event) => {
      e.preventDefault();
      if (isPartyDropdownOpen) {
        setIsPartyDropdownOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [isOpen, isPartyDropdownOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId) {
      setError('Please select a party/customer.');
      return;
    }
    if (companies.length > 0 && !companyId) {
      setError('Please select the related company for this payment.');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    const selectedParty = parties.find((p) => p.id === partyId);
    if (!selectedParty) {
      setError('Selected party could not be found.');
      return;
    }

    const selectedCompany = companies.find((c) => c.id === companyId);
    const selectedInvoice = invoices.find((i) => i.id === invoiceId);

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const paymentData: PartyPayment = {
        id: editingPayment ? editingPayment.id : generateId(),
        partyId,
        partyName: selectedParty.name,
        companyId: companyId || undefined,
        companyName: selectedCompany ? selectedCompany.name : undefined,
        invoiceId: invoiceId || undefined,
        invoiceNumber: selectedInvoice ? selectedInvoice.invoiceNumber : undefined,
        date: date || getTodayDateString(),
        amount: Math.round(numAmount),
        paymentMethod,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        createdAt: editingPayment ? editingPayment.createdAt : now,
        updatedAt: now,
      };

      await onSave(paymentData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPartyObj = parties.find((p) => p.id === partyId);
  const selectedCompanyObj = companies.find((c) => c.id === companyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingPayment ? 'Edit Payment' : 'Record Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Connected Ledgers Notice */}
          <div className="flex items-start p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
            <Building2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
            <span>
              This payment reduces the <strong>Party's Amount Due</strong> and is recorded under the linked <strong>Company Ledger</strong>.
            </span>
          </div>

          {/* Company Selection */}
          {companies.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Supplier <span className="text-red-500">*</span>
              </label>
              {defaultCompanyId && selectedCompanyObj && !editingPayment ? (
                <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">{selectedCompanyObj.name}</span>
                </div>
              ) : (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Company...</option>
                  {relevantCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Party Selection with Autocomplete */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Party / Customer <span className="text-red-500">*</span>
            </label>
            {defaultPartyId && selectedPartyObj && !editingPayment ? (
              <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{selectedPartyObj.name}</span>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={partySearch}
                    onChange={(e) => {
                      setPartySearch(e.target.value);
                      setIsPartyDropdownOpen(true);
                      if (partyId) setPartyId('');
                    }}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    placeholder="Search party by name or phone... (e.g. Mu)"
                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  {partySearch && (
                    <button
                      type="button"
                      onClick={handleClearParty}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isPartyDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 animate-in fade-in duration-100">
                    {filteredParties.length > 0 ? (
                      filteredParties.map((p) => {
                        const isSelected = p.id === partyId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectParty(p)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50 text-xs transition ${
                              isSelected ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-slate-900">{p.name}</div>
                              {p.phone && <div className="text-[11px] text-slate-500">{p.phone}</div>}
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No parties found matching <span className="font-semibold text-slate-700">"{partySearch}"</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedPartyObj && !defaultPartyId && (
              <div className="mt-1 flex items-center text-[11px] text-emerald-700 font-medium">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Selected: <span className="font-bold ml-1">{selectedPartyObj.name}</span>
              </div>
            )}
          </div>

          {/* Optional: Specific Invoice Allocation */}
          {relevantInvoices.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link to Invoice (Optional)
              </label>
              <div className="relative">
                <select
                  value={invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">General Account Payment (Unlinked)</option>
                  {relevantInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Invoice #{inv.invoiceNumber} — {formatPKR(inv.amount)}
                      {inv.companyName ? ` (${inv.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold text-xs">
                  Rs
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              {Number(amount) > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatted: <span className="font-semibold text-slate-700">{formatPKR(Number(amount))}</span>
                </p>
              )}
            </div>

            <div>
              <DateInput
                label="Payment Date"
                required
                value={date}
                onChange={setDate}
                align="right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition ${
                    paymentMethod === method
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Cheque # (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TR-987654 or Cheque #102"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received via collection boy"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingPayment ? 'Save Changes' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
