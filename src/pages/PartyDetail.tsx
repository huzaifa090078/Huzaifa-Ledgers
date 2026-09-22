import React, { useState } from 'react';
import {
  Phone,
  MapPin,
  FileText,
  PlusCircle,
  Download,
  Share2,
  Edit2,
  Trash2,
  Clock,
  ArrowDownLeft,
  ArrowLeft,
} from 'lucide-react';
import type { Party, PartyInvoice, PartyPayment } from '../types';
import {
  getPartyLedgerTimeline,
  calculatePartyBalance,
  formatPKR,
  formatDateDisplay,
} from '../services/accounting';
import { downloadPartyLedgerPDF } from '../services/pdf';
import { sharePartyLedger } from '../services/share';

interface PartyDetailProps {
  party: Party;
  invoices: PartyInvoice[];
  partyPayments: PartyPayment[];
  onBack: () => void;
  onOpenAddInvoice: (partyId: string) => void;
  onOpenRecordPayment: (partyId: string) => void;
  onEditInvoice: (invoice: PartyInvoice) => void;
  onDeleteInvoice: (invoice: PartyInvoice) => void;
  onEditPayment: (payment: PartyPayment) => void;
  onDeletePayment: (payment: PartyPayment) => void;
}

export const PartyDetail: React.FC<PartyDetailProps> = ({
  party,
  invoices,
  partyPayments,
  onBack,
  onOpenAddInvoice,
  onOpenRecordPayment,
  onEditInvoice,
  onDeleteInvoice,
  onEditPayment,
  onDeletePayment,
}) => {
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const timeline = getPartyLedgerTimeline(party.id, invoices, partyPayments);
  const balanceInfo = calculatePartyBalance(party.id, invoices, partyPayments);

  const handleExportPDF = async () => {
    setSharing(true);
    setShareFeedback(null);
    try {
      const res = await downloadPartyLedgerPDF(party, invoices, partyPayments);
      if (res?.message) {
        setShareFeedback(res.message);
        setTimeout(() => setShareFeedback(null), 4000);
      }
    } catch (err: any) {
      setShareFeedback('Failed to export PDF.');
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      setSharing(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setSharing(true);
    setShareFeedback(null);
    try {
      const res = await sharePartyLedger(party, invoices, partyPayments);
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 4000);
    } catch (err: any) {
      setShareFeedback('Could not trigger share.');
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-20">
      {/* Top Party Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white">
          <div className="mb-2">
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs text-sky-400 hover:text-sky-300 transition -ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Parties List</span>
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                Party Ledger Record
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight m-0">
                {party.name}
              </h2>
              {party.phone && (
                <div className="flex items-center space-x-1 text-slate-300 text-xs mt-1">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  <a href={`tel:${party.phone}`} className="hover:underline font-mono">
                    {party.phone}
                  </a>
                </div>
              )}
              {party.address && (
                <div className="flex items-center space-x-1 text-slate-400 text-[11px] mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{party.address}</span>
                </div>
              )}
            </div>

            {/* Current Balance / Remaining Amount */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                {balanceInfo.isAdvance ? 'Advance Balance' : 'Remaining Amount'}
              </span>
              <div
                className={`text-xl font-black font-mono tracking-tight ${
                  balanceInfo.isAdvance
                    ? 'text-emerald-400'
                    : balanceInfo.currentBalance > 0
                    ? 'text-red-400'
                    : 'text-slate-300'
                }`}
              >
                {balanceInfo.isAdvance
                  ? `(Adv: ${formatPKR(balanceInfo.advanceAmount)})`
                  : formatPKR(balanceInfo.currentBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Totals Banner */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Invoices (Amount Added)
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {formatPKR(balanceInfo.totalInvoices)}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[10px] text-slate-500 font-medium block">
              Total Payments Received
            </span>
            <span className="font-bold text-emerald-700 font-mono">
              {formatPKR(balanceInfo.totalPayments)}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-white text-center">
          <button
            onClick={() => onOpenAddInvoice(party.id)}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200/70 transition"
          >
            <FileText className="w-4 h-4 text-amber-700 mb-1" />
            <span className="text-[10px] font-semibold">+ Invoice</span>
          </button>

          <button
            onClick={() => onOpenRecordPayment(party.id)}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 border border-emerald-200/70 transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700 mb-1" />
            <span className="text-[10px] font-semibold">+ Payment</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-700 mb-1" />
            <span className="text-[10px] font-semibold">PDF Export</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-900 border border-sky-200 transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-sky-700 mb-1" />
            <span className="text-[10px] font-semibold">
              {sharing ? 'Sharing...' : 'WhatsApp'}
            </span>
          </button>
        </div>

        {shareFeedback && (
          <div className="mx-3 mb-3 p-2 text-xs bg-sky-50 text-sky-800 rounded-lg border border-sky-200 flex items-center justify-between">
            <span>{shareFeedback}</span>
            <button
              onClick={() => setShareFeedback(null)}
              className="text-sky-600 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Ledger Section Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
          Chronological Ledger
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">
          {timeline.entries.length} entries
        </span>
      </div>

      {/* Ledger List (Mobile Card Style with Debit/Credit/Running Balance) */}
      {timeline.entries.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700 mb-1">Ledger is Empty</h4>
          <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
            No invoices or payments have been recorded for {party.name} yet.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => onOpenAddInvoice(party.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg shadow-xs hover:bg-amber-700"
            >
              + Add Company Invoice
            </button>
            <button
              onClick={() => onOpenRecordPayment(party.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700"
            >
              + Record Payment
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.entries.map((entry) => {
            const isInvoice = entry.type === 'invoice';

            return (
              <div
                key={`${entry.type}-${entry.id}`}
                className={`bg-white rounded-xl border p-3.5 shadow-2xs transition ${
                  isInvoice ? 'border-amber-100 hover:border-amber-200' : 'border-emerald-100 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isInvoice
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isInvoice ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {isInvoice ? `Invoice #${entry.invoiceNumber}` : `Payment - ${entry.paymentMethod}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateDisplay(entry.date)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5 m-0 leading-tight">
                        {entry.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => {
                        if (isInvoice) onEditInvoice(entry.rawItem as PartyInvoice);
                        else onEditPayment(entry.rawItem as PartyPayment);
                      }}
                      title="Edit Entry"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (isInvoice) onDeleteInvoice(entry.rawItem as PartyInvoice);
                        else onDeletePayment(entry.rawItem as PartyPayment);
                      }}
                      title="Delete Entry"
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Ledger Numbers Grid: Amount Added / Payment Received / Balance */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Amount Added (+)
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        entry.debit > 0 ? 'text-amber-700' : 'text-slate-300'
                      }`}
                    >
                      {entry.debit > 0 ? formatPKR(entry.debit) : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                      Payment Received (-)
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        entry.credit > 0 ? 'text-emerald-700' : 'text-slate-300'
                      }`}
                    >
                      {entry.credit > 0 ? formatPKR(entry.credit) : '-'}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-md py-0.5">
                    <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                      Remaining Amount
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        entry.balance > 0
                          ? 'text-red-600'
                          : entry.balance < 0
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {entry.balance < 0 ? `(Adv: ${formatPKR(Math.abs(entry.balance))})` : formatPKR(entry.balance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Final Running Balance Banner */}
          <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
              REMAINING AMOUNT:
            </span>
            <span
              className={`text-base font-extrabold font-mono ${
                balanceInfo.isAdvance
                  ? 'text-emerald-400'
                  : balanceInfo.currentBalance > 0
                  ? 'text-red-400'
                  : 'text-slate-200'
              }`}
            >
              {balanceInfo.isAdvance
                ? `Advance: ${formatPKR(balanceInfo.advanceAmount)}`
                : formatPKR(balanceInfo.currentBalance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
