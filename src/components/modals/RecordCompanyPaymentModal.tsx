import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, CreditCard, Info, Receipt } from 'lucide-react';
import type { CompanyPayment, CompanyPaymentMethod } from '../../types';
import { generateId } from '../../db';
import { getTodayDateString, formatPKR } from '../../services/accounting';

interface RecordCompanyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: CompanyPayment) => Promise<void>;
  editingPayment?: CompanyPayment | null;
}

const PAYMENT_METHODS: CompanyPaymentMethod[] = ['Cash', 'Bank', 'Other'];

export const RecordCompanyPaymentModal: React.FC<RecordCompanyPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPayment,
}) => {
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CompanyPaymentMethod>('Bank');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPayment) {
      setDate(editingPayment.date);
      setAmount(String(editingPayment.amount));
      setPaymentMethod(editingPayment.paymentMethod);
      setReference(editingPayment.reference || '');
      setNote(editingPayment.note || '');
    } else {
      setDate(getTodayDateString());
      setAmount('');
      setPaymentMethod('Bank');
      setReference('');
      setNote('');
    }
    setError('');
  }, [editingPayment, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid deposit amount greater than zero.');
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const paymentData: CompanyPayment = {
        id: editingPayment ? editingPayment.id : generateId(),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingPayment ? 'Edit Company Payment' : 'Pay / Deposit to Login Smart Technology'}
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

          {/* Explicit rule notice */}
          <div className="flex items-start p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-lg text-xs text-indigo-950">
            <Info className="w-4 h-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
            <span>
              <strong>Rule:</strong> Depositing money to Login Smart Technology reduces only your <strong>Amount Payable to the company</strong>. It does <strong>NOT</strong> reduce any party's Amount Due.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Date <span className="text-red-500">*</span>
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
                  className="w-full pl-8 pr-2 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as CompanyPaymentMethod)}
                  className="w-full pl-8 pr-2 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Deposited (PKR) <span className="text-red-500">*</span>
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
                placeholder="e.g. 15000"
                required
                className="w-full pl-9 pr-3 py-2.5 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {Number(amount) > 0 && (
              <p className="text-[11px] text-indigo-700 mt-1">
                Amount: <span className="font-semibold">{formatPKR(Number(amount))}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt # / Deposit Slip / Reference (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. HBL-Deposit-98213"
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note / Company Memo (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Cash handed to Company Accounts"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs"
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
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Recording...' : editingPayment ? 'Save Payment' : 'Record Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
