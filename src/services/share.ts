import type { Party, PartyInvoice, PartyPayment } from '../types';
import {
  calculatePartyPeriodLedger,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
} from './accounting';

export interface ShareResult {
  sharedViaWebShare: boolean;
  downloadTriggered: boolean;
  message: string;
}

/**
 * Builds readable text representation of the ledger statement for WhatsApp sharing.
 */
export function buildLedgerSummaryText(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  startDate?: string,
  endDate?: string
): string {
  const periodLedger = calculatePartyPeriodLedger(party.id, invoices, payments, startDate, endDate);

  if (startDate) {
    return (
      `*Login Smart Technology Ledger Statement*\n` +
      `Party: *${party.name}*\n` +
      `Period: *${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate || getTodayDateString())}*\n` +
      `Opening Balance: ${periodLedger.isOpeningAdvance ? `(Adv: ${formatPKR(Math.abs(periodLedger.openingBalance))})` : formatPKR(periodLedger.openingBalance)}\n` +
      `Period Invoices: ${formatPKR(periodLedger.periodInvoicesTotal)}\n` +
      `Period Payments: ${formatPKR(periodLedger.periodPaymentsTotal)}\n` +
      `*Closing Balance: ${periodLedger.isClosingAdvance ? `(Advance: ${formatPKR(Math.abs(periodLedger.closingBalance))})` : formatPKR(periodLedger.closingBalance)}*`
    );
  }

  return (
    `*Login Smart Technology Ledger Statement*\n` +
    `Party: *${party.name}*\n` +
    `Date: ${formatDateDisplay(getTodayDateString())}\n` +
    `Total Invoices: ${formatPKR(periodLedger.periodInvoicesTotal)}\n` +
    `Total Payments: ${formatPKR(periodLedger.periodPaymentsTotal)}\n` +
    `*Remaining Amount: ${periodLedger.isClosingAdvance ? `(Advance: ${formatPKR(Math.abs(periodLedger.closingBalance))})` : formatPKR(periodLedger.closingBalance)}*`
  );
}

/**
 * Shares party ledger as a readable WhatsApp TEXT message directly to the party's saved phone number.
 * Strictly does NOT generate, attach, or download any PDF.
 */
export async function sharePartyLedger(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  _salesmanName = 'Sales Representative',
  startDate?: string,
  endDate?: string
): Promise<ShareResult> {
  const summaryText = buildLedgerSummaryText(party, invoices, payments, startDate, endDate);

  // If party has a saved phone number, open WhatsApp directly for that phone number
  if (party.phone && party.phone.trim().length > 0) {
    const rawDigits = party.phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawDigits.startsWith('92')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '92' + rawDigits.substring(1)
      : rawDigits;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(summaryText)}`;

    // Open WhatsApp
    const win = window.open(waUrl, '_blank');
    if (!win) {
      window.location.href = waUrl;
    }

    return {
      sharedViaWebShare: true,
      downloadTriggered: false,
      message: 'Opening WhatsApp chat...',
    };
  }

  // Fallback if party has no phone number: use Web Share API or generic WhatsApp link
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Ledger - ${party.name}`,
        text: summaryText,
      });
      return {
        sharedViaWebShare: true,
        downloadTriggered: false,
        message: 'Ledger text shared successfully.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          sharedViaWebShare: false,
          downloadTriggered: false,
          message: 'Share cancelled.',
        };
      }
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
  const win = window.open(waUrl, '_blank');
  if (!win) {
    window.location.href = waUrl;
  }

  return {
    sharedViaWebShare: true,
    downloadTriggered: false,
    message: 'Opening WhatsApp...',
  };
}
