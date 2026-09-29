import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Building2, Search, Check, Wallet, ArrowRightLeft } from 'lucide-react';
import type { Company, Party, CompanyPayment, CompanyPaymentMethod } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR } from '../../services/accounting';
import { DateInput } from '../common/DateInput';

interface RecordCompanyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: CompanyPayment) => Promise<void>;
  companies?: Company[];
  parties?: Party[];
  defaultCompanyId?: string;
  editingPayment?: CompanyPayment | null;
}

const PAYMENT_METHODS: CompanyPaymentMethod[] = ['Cash', 'Account', 'Bank', 'Easypaisa', 'JazzCash', 'Other'];

export const RecordCompanyPaymentModal: React.FC<RecordCompanyPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  companies = [],
  parties = [],
  defaultCompanyId,
  editingPayment,
}) => {
  const [workflow, setWorkflow] = useState<'standard' | 'direct'>('standard');
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');

  // Party selector states for direct customer workflow
  const [partyId, setPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CompanyPaymentMethod>('Bank');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (editingPayment) {
      const isDirect = Boolean(editingPayment.isDirectPartyPayment || editingPayment.partyId);
      setWorkflow(isDirect ? 'direct' : 'standard');
      setCompanyId(editingPayment.companyId || defaultCompanyId || '');
      setPartyId(editingPayment.partyId || '');
      const foundParty = parties.find((p) => p.id === editingPayment.partyId);
      setPartySearch(foundParty ? foundParty.name : editingPayment.partyName || '');
      setDate(editingPayment.date);
      setAmount(String(editingPayment.amount));
      setPaymentMethod(editingPayment.paymentMethod);
      setReference(editingPayment.reference || '');
      setNote(editingPayment.note || '');
    } else {
      setWorkflow('standard');
      setCompanyId(defaultCompanyId || (companies.length > 0 ? companies[0].id : ''));
      setPartyId('');
      setPartySearch('');
      setDate(getTodayDateString());
      setAmount('');
      setPaymentMethod('Bank');
      setReference('');
      setNote('');
    }
    setIsPartyDropdownOpen(false);
    setError('');
  }, [editingPayment, defaultCompanyId, companies, parties, isOpen]);

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

  const handleSelectParty = (p: Party) => {
    setPartyId(p.id);
    setPartySearch(p.name);
    setIsPartyDropdownOpen(false);
    setError('');
  };

  const handleClearParty = () => {
    setPartyId('');
    setPartySearch('');
    setIsPartyDropdownOpen(true);
  };

  if (!isOpen) return null;

  const targetCompany = companies.find((c) => c.id === companyId);
  const companyName = targetCompany ? targetCompany.name : editingPayment?.companyName || '';
  const selectedPartyObj = parties.find((p) => p.id === partyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (companies.length > 0 && !companyId) {
      setError('Please select a company/supplier.');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (workflow === 'direct') {
      if (!partyId) {
        setError('Please select the customer/party who made this payment.');
        return;
      }
    }

    const isDirect = workflow === 'direct';

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const paymentData: CompanyPayment = {
        id: editingPayment ? editingPayment.id : generateId(),
        companyId: companyId || undefined,
        companyName: companyName || undefined,
        partyId: isDirect && partyId ? partyId : undefined,
        partyName: isDirect && selectedPartyObj ? selectedPartyObj.name : undefined,
        isDirectPartyPayment: isDirect,
        linkedPaymentId: editingPayment ? editingPayment.linkedPaymentId : undefined,
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
      setError(err.message || 'Failed to record company payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingPayment ? 'Edit Company Payment' : companyName ? `Pay / Deposit to ${companyName}` : 'Pay Company / Supplier'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="company-payment-form" onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Workflow Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Source / Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setWorkflow('standard')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  workflow === 'standard'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-4 h-4 text-indigo-600" />
                <span>Own Funds Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkflow('direct')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  workflow === 'direct'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <span>Direct from Customer</span>
              </button>
            </div>
          </div>

          {/* Workflow Explanatory Banner */}
          {workflow === 'standard' ? (
            <div className="flex items-start p-2.5 bg-indigo-50/80 border border-indigo-200/80 rounded-lg text-xs text-indigo-950">
              <Building2 className="w-4 h-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
              <span>
                <strong>Own Funds Payment:</strong> Reduces your company payable balance. Customer balances are not affected.
              </span>
            </div>
          ) : (
            <div className="flex items-start p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
              <span>
                <strong>Direct from Customer:</strong> Customer pays supplier directly. This will <strong>simultaneously reduce customer balance</strong> AND <strong>reduce company payable balance</strong> with zero double-counting.
              </span>
            </div>
          )}

          {/* Company Selection */}
          {companies.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Supplier <span className="text-red-500">*</span>
              </label>
              {defaultCompanyId && targetCompany && !editingPayment ? (
                <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">{targetCompany.name}</span>
                </div>
              ) : (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

          {/* Customer Selection for Direct Workflow */}
          {workflow === 'direct' && (
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paying Customer / Party <span className="text-red-500">*</span>
              </label>
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
                    placeholder="Search paying party by name or phone..."
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

              {selectedPartyObj && (
                <div className="mt-1 flex items-center text-[11px] text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Selected Party: <span className="font-bold ml-1">{selectedPartyObj.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount and Date Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600 font-bold text-xs">
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
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              {Number(amount) > 0 && (
                <p className="text-[11px] text-indigo-700 mt-1 font-mono font-medium">
                  Formatted: {formatPKR(Number(amount))}
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

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition ${
                    paymentMethod === m
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt # / Deposit Slip / Reference (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TR-98213 / Bank Slip"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note / Memo (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Cash paid for stock invoices / direct settlement"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        {/* Pinned Action Bar at Bottom (Keyboard safe) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition active:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="company-payment-form"
            disabled={loading}
            className="flex-1 py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingPayment ? 'Save Payment' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
