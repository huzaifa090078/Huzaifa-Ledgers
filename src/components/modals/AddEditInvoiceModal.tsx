import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, FileText, Hash, Building2, User, Search, Check, AlertCircle } from 'lucide-react';
import type { Party, Company, PartyInvoice } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR, checkCompanyInvoiceUniqueness } from '../../services/accounting';
import { DateInput } from '../common/DateInput';

interface AddEditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: PartyInvoice) => Promise<void>;
  parties: Party[];
  companies?: Company[];
  invoices?: PartyInvoice[];
  defaultPartyId?: string;
  defaultCompanyId?: string;
  editingInvoice?: PartyInvoice | null;
}

export const AddEditInvoiceModal: React.FC<AddEditInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  parties,
  companies = [],
  invoices = [],
  defaultPartyId,
  defaultCompanyId,
  editingInvoice,
}) => {
  const [partyId, setPartyId] = useState(defaultPartyId || '');
  const [partySearch, setPartySearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title?: string; message: string } | null>(null);

  useEffect(() => {
    if (editingInvoice) {
      setPartyId(editingInvoice.partyId);
      const foundParty = parties.find((p) => p.id === editingInvoice.partyId);
      setPartySearch(foundParty ? foundParty.name : editingInvoice.partyName);
      setCompanyId(editingInvoice.companyId || defaultCompanyId || (companies.length === 1 ? companies[0].id : ''));
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setDate(editingInvoice.date);
      setAmount(String(editingInvoice.amount));
      setDescription(editingInvoice.description || '');
    } else {
      const initialPartyId = defaultPartyId || '';
      setPartyId(initialPartyId);
      const foundParty = parties.find((p) => p.id === initialPartyId);
      setPartySearch(foundParty ? foundParty.name : '');
      setCompanyId(defaultCompanyId || (companies.length === 1 ? companies[0].id : ''));
      setInvoiceNumber('');
      setDate(getTodayDateString());
      setAmount('');
      setDescription('');
    }
    setIsPartyDropdownOpen(false);
    setError(null);
  }, [editingInvoice, defaultPartyId, defaultCompanyId, parties, companies, isOpen]);

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

  const selectedPartyObj = useMemo(() => {
    return parties.find((p) => p.id === partyId);
  }, [parties, partyId]);

  const selectedCompanyObj = useMemo(() => {
    return companies.find((c) => c.id === companyId);
  }, [companies, companyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId) {
      setError({ message: 'Please search and select a party/customer.' });
      return;
    }
    if (companies.length > 0 && !companyId) {
      setError({ message: 'Please select a company/supplier for this invoice.' });
      return;
    }
    if (!invoiceNumber.trim()) {
      setError({ message: 'Invoice number is required.' });
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError({ message: 'Please enter a valid invoice amount greater than zero.' });
      return;
    }

    const selectedParty = parties.find((p) => p.id === partyId);
    if (!selectedParty) {
      setError({ message: 'Selected party could not be found. Please search again.' });
      return;
    }

    const selectedCompany = companies.find((c) => c.id === companyId);
    const candidateCompanyId = companyId || undefined;
    const candidateCompanyName = selectedCompany ? selectedCompany.name : undefined;

    // Check Company-wise invoice number uniqueness
    const uniquenessCheck = checkCompanyInvoiceUniqueness(invoices, {
      invoiceNumber: invoiceNumber.trim(),
      companyId: candidateCompanyId,
      companyName: candidateCompanyName,
      currentInvoiceId: editingInvoice ? editingInvoice.id : undefined,
    });

    if (uniquenessCheck.isDuplicate) {
      setError({
        title: 'Invoice Already Exists',
        message: uniquenessCheck.message || `Invoice #${invoiceNumber.trim()} already exists for ${candidateCompanyName || 'this company'}. Please use a different invoice number.`,
      });
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const invoiceData: PartyInvoice = {
        id: editingInvoice ? editingInvoice.id : generateId(),
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        partyId,
        partyName: selectedParty.name,
        companyId: candidateCompanyId,
        companyName: candidateCompanyName,
        date: date || getTodayDateString(),
        amount: Math.round(numAmount),
        description: description.trim() || undefined,
        createdAt: editingInvoice ? editingInvoice.createdAt : now,
        updatedAt: now,
      };

      await onSave(invoiceData);
      onClose();
    } catch (err: any) {
      setError({
        title: err.message?.includes('already exists') ? 'Invoice Already Exists' : undefined,
        message: err.message || 'Failed to save invoice.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParty = (p: Party) => {
    setPartyId(p.id);
    setPartySearch(p.name);
    setIsPartyDropdownOpen(false);
    setError(null);
  };

  const handleClearParty = () => {
    setPartyId('');
    setPartySearch('');
    setIsPartyDropdownOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
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
            <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs">
              {error.title && (
                <div className="flex items-center space-x-1.5 font-bold text-red-900 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error.title}</span>
                </div>
              )}
              <p className="m-0 leading-relaxed font-medium">{error.message}</p>
            </div>
          )}

          {/* Connected Ledgers Notice */}
          <div className="flex items-start p-2.5 bg-sky-50/80 border border-sky-200/80 rounded-lg text-xs text-sky-950">
            <Building2 className="w-4 h-4 text-sky-600 mr-2 shrink-0 mt-0.5" />
            <span>
              This single invoice automatically updates both the <strong>Party Ledger</strong> and the <strong>Company Ledger</strong>.
            </span>
          </div>

          {/* Company Selector */}
          {companies.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Supplier <span className="text-red-500">*</span>
              </label>
              {defaultCompanyId && selectedCompanyObj && !editingInvoice ? (
                <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">{selectedCompanyObj.name}</span>
                </div>
              ) : (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Select Company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Party Autocomplete Selector */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Party / Customer <span className="text-red-500">*</span>
            </label>

            {defaultPartyId && selectedPartyObj && !editingInvoice ? (
              <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-sky-600" />
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
                      if (partyId) {
                        setPartyId('');
                      }
                    }}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    placeholder="Search party by name or phone... (e.g. Mu)"
                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
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
                            className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-sky-50 text-xs transition ${
                              isSelected ? 'bg-sky-50 font-semibold text-sky-900' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-slate-900">{p.name}</div>
                              {p.phone && <div className="text-[11px] text-slate-500">{p.phone}</div>}
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-sky-600" />}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (error?.title === 'Invoice Already Exists') {
                      setError(null);
                    }
                  }}
                  placeholder="e.g. INV-001"
                  required
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 uppercase font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <DateInput
                label="Invoice Date"
                required
                value={date}
                onChange={setDate}
                align="right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Amount (PKR) <span className="text-red-500">*</span>
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
                placeholder="e.g. 50000"
                required
                className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            {Number(amount) > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Formatted: <span className="font-semibold text-slate-700">{formatPKR(Number(amount))}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Items Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10x Cartons / Products"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
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
              className="flex-1 py-2 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingInvoice ? 'Save Changes' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
