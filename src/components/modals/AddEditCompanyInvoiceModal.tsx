import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Hash, Building2 } from 'lucide-react';
import type { Company, CompanyInvoice } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR } from '../../services/accounting';

interface AddEditCompanyInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: CompanyInvoice) => Promise<void>;
  companies: Company[];
  defaultCompanyId?: string;
  editingInvoice?: CompanyInvoice | null;
}

export const AddEditCompanyInvoiceModal: React.FC<AddEditCompanyInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  companies,
  defaultCompanyId,
  editingInvoice,
}) => {
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingInvoice) {
      setCompanyId(editingInvoice.companyId);
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setDate(editingInvoice.date);
      setAmount(String(editingInvoice.amount));
      setDescription(editingInvoice.description || '');
    } else {
      setCompanyId(defaultCompanyId || (companies.length > 0 ? companies[0].id : ''));
      setInvoiceNumber('');
      setDate(getTodayDateString());
      setAmount('');
      setDescription('');
    }
    setError('');
  }, [editingInvoice, defaultCompanyId, companies, isOpen]);

  // Listen to Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    const handleAppBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      setError('Please select a company/supplier.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice / Bill number is required.');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const selectedCompany = companies.find((c) => c.id === companyId);
    if (!selectedCompany) {
      setError('Selected company could not be found.');
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const invoiceData: CompanyInvoice = {
        id: editingInvoice ? editingInvoice.id : generateId(),
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        companyId,
        companyName: selectedCompany.name,
        date: date || getTodayDateString(),
        amount: Math.round(numAmount),
        description: description.trim() || undefined,
        createdAt: editingInvoice ? editingInvoice.createdAt : now,
        updatedAt: now,
      };

      await onSave(invoiceData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save company invoice.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingInvoice ? 'Edit Company Invoice' : 'Add Purchase / Company Invoice'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Company Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company / Supplier <span className="text-red-500">*</span>
            </label>
            {defaultCompanyId && selectedCompany && !editingInvoice ? (
              <div className="flex items-center space-x-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">{selectedCompany.name}</span>
              </div>
            ) : (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

          {/* Invoice / Bill Number & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice / Bill # <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. BILL-101"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Amount (Payable Increase) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Amount (Increases Payable) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-xs text-slate-500">
                Rs
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            {Number(amount) > 0 && (
              <p className="text-[11px] text-indigo-700 mt-1 font-mono font-medium">
                Entered: {formatPKR(Number(amount))}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Stock shipment received, 50 cartons"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
