import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin } from 'lucide-react';
import type { Party } from '../../types';
import { generateId } from '../../db';

interface AddEditPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (party: Party) => Promise<void>;
  editingParty?: Party | null;
}

export const AddEditPartyModal: React.FC<AddEditPartyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingParty,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingParty) {
      setName(editingParty.name);
      setPhone(editingParty.phone || '');
      setAddress(editingParty.address || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
    }
    setError('');
  }, [editingParty, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Party / Shop name is required.');
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const partyData: Party = {
        id: editingParty ? editingParty.id : generateId(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        createdAt: editingParty ? editingParty.createdAt : now,
        updatedAt: now,
      };

      await onSave(partyData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save party.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-800 m-0">
              {editingParty ? 'Edit Party' : 'Add New Party / Shop'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full active:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Party / Shop Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ali Traders"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Address / Market Location (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop # 12, Main Market, Lahore"
                rows={2}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition resize-none"
              />
            </div>
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
              {loading ? 'Saving...' : editingParty ? 'Save Changes' : 'Create Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
