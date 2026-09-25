import type { Party, PartyInvoice, PartyPayment, Company, CompanyInvoice, CompanyPayment } from '../types';
import { calculatePartyBalance, calculateSingleCompanyBalance, formatPKR } from './accounting';

export interface ShareResult {
  sharedViaWebShare: boolean;
  downloadTriggered: boolean;
  message: string;
}

/**
 * Builds short, simple plain-text WhatsApp message for normal Share button.
 * Format:
 * Party: {Party Name}
 *
 * Last Balance: Rs. {amount}
 * Recent Payment: Rs. {amount}
 * Pending Balance: Rs. {amount}
 */
export function buildLedgerSummaryText(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[]
): string {
  const balanceInfo = calculatePartyBalance(party.id, invoices, payments);

  // Find most recent payment for this party
  const partyPayments = payments
    .filter((p) => p.partyId === party.id)
    .sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const recentPayment = partyPayments.length > 0 ? partyPayments[0] : null;
  const recentPaymentAmount = recentPayment ? recentPayment.amount : 0;
  const pendingBalance = balanceInfo.currentBalance;
  const lastBalance = pendingBalance + recentPaymentAmount;

  return (
    `Party: ${party.name}\n\n` +
    `Last Balance: ${formatPKR(lastBalance)}\n` +
    `Recent Payment: ${formatPKR(recentPaymentAmount)}\n` +
    `Pending Balance: ${formatPKR(pendingBalance)}`
  );
}

/**
 * Shares party ledger as a readable plain-text WhatsApp message directly to the party's saved phone number.
 * Strictly does NOT generate, attach, or download any PDF.
 */
export async function sharePartyLedger(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[]
): Promise<ShareResult> {
  const summaryText = buildLedgerSummaryText(party, invoices, payments);

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

/**
 * Builds short, simple plain-text WhatsApp message for company ledger summary.
 * Format:
 * Company: {Company Name}
 *
 * Last Balance: Rs. {amount}
 * Recent Payment: Rs. {amount}
 * Pending Balance: Rs. {amount}
 */
export function buildCompanyLedgerSummaryText(
  company: { name: string; id: string },
  invoices: (PartyInvoice | CompanyInvoice)[],
  payments: (PartyPayment | CompanyPayment)[]
): string {
  const balanceInfo = calculateSingleCompanyBalance(company.id, invoices, payments);

  // Find most recent payment for this company
  const companyPayments = payments
    .filter((p) => p.companyId === company.id)
    .sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const recentPayment = companyPayments.length > 0 ? companyPayments[0] : null;
  const recentPaymentAmount = recentPayment ? recentPayment.amount : 0;
  const pendingBalance = balanceInfo.currentBalance;
  const lastBalance = pendingBalance + recentPaymentAmount;

  return (
    `Company: ${company.name}\n\n` +
    `Last Balance: ${formatPKR(lastBalance)}\n` +
    `Recent Payment: ${formatPKR(recentPaymentAmount)}\n` +
    `Pending Balance: ${formatPKR(pendingBalance)}`
  );
}

/**
 * Shares company ledger as a readable plain-text WhatsApp message directly to the company's saved phone number.
 */
export async function shareCompanyLedger(
  company: Company,
  invoices: (PartyInvoice | CompanyInvoice)[],
  payments: (PartyPayment | CompanyPayment)[]
): Promise<ShareResult> {
  const summaryText = buildCompanyLedgerSummaryText(company, invoices, payments);

  // If company has a saved phone number, open WhatsApp directly for that phone number
  if (company.phone && company.phone.trim().length > 0) {
    const rawDigits = company.phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawDigits.startsWith('92')
      ? rawDigits
      : rawDigits.startsWith('0')
      ? '92' + rawDigits.substring(1)
      : rawDigits;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(summaryText)}`;

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

  // Fallback if company has no phone number: use Web Share API or generic WhatsApp link
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Ledger - ${company.name}`,
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
