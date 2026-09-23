import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Hash, AlertCircle } from 'lucide-react';
import type { Party, PartyInvoice } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR } from '../../services/accounting';

interface AddEditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: PartyInvoice) => Promise<void>;
  parties: Party[];
  defaultPartyId?: string;
  editingInvoice?: PartyInvoice | null;
}

export const AddEditInvoiceModal: React.FC<AddEditInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  parties,
  defaultPartyId,
  editingInvoice,
}) => {
  const [partyId, setPartyId] = useState(defaultPartyId || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingInvoice) {
      setPartyId(editingInvoice.partyId);
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setDate(editingInvoice.date);
      setAmount(String(editingInvoice.amount));
      setDescription(editingInvoice.description || '');
    } else {
      setPartyId(defaultPartyId || (parties.length > 0 ? parties[0].id : ''));
      setInvoiceNumber('');
      setDate(getTodayDateString());
      setAmount('');
      setDescription('');
    }
    setError('');
  }, [editingInvoice, defaultPartyId, parties, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId) {
      setError('Please select a party/shop.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid invoice amount greater than zero.');
      return;
    }

    const selectedParty = parties.find((p) => p.id === partyId);
    if (!selectedParty) {
      setError('Selected party could not be found.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingInvoice ? 'Edit Company Invoice' : 'Add Company Invoice / Sale'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Info Notice regarding dual-effect */}
          <div className="flex items-start p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 mr-2 shrink-0 mt-0.5" />
            <span>
              This company invoice increases the <strong>Party's Amount Due</strong> and increases your <strong>Amount Payable to Login Smart Technology</strong>.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Party / Shop <span className="text-red-500">*</span>
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              disabled={!!editingInvoice || (!!defaultPartyId && parties.length > 0)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 disabled:opacity-75 disabled:bg-slate-100"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
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
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. A-1025"
                  required
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 uppercase font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-8 pr-2 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
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
                placeholder="e.g. 30000"
                required
                className="w-full pl-9 pr-3 py-2.5 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
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
              placeholder="e.g. 10x Product Boxes, 5x Cartons"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingInvoice ? 'Save Changes' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
