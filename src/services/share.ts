import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Party, PartyInvoice, PartyPayment } from '../types';
import { generatePartyLedgerPDF, blobToBase64 } from './pdf';
import { calculatePartyBalance, formatPKR, formatDateDisplay, getTodayDateString } from './accounting';

export interface ShareResult {
  sharedViaWebShare: boolean;
  downloadTriggered: boolean;
  message: string;
}

/**
 * Shares party ledger via native Web Share / Capacitor Share API (WhatsApp/System share)
 * with robust fallbacks: file download and formatted WhatsApp text link.
 */
export async function sharePartyLedger(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  salesmanName = 'Sales Representative'
): Promise<ShareResult> {
  const { pdfBlob, filename } = generatePartyLedgerPDF(party, invoices, payments, salesmanName);
  const balanceInfo = calculatePartyBalance(party.id, invoices, payments);

  const summaryText = `*Smart Technology Ledger Statement*\n` +
    `Party: *${party.name}*\n` +
    `Date: ${formatDateDisplay(getTodayDateString())}\n` +
    `Total Invoices: ${formatPKR(balanceInfo.totalInvoices)}\n` +
    `Total Payments: ${formatPKR(balanceInfo.totalPayments)}\n` +
    `*Remaining Amount: ${balanceInfo.isAdvance ? `(Advance: ${formatPKR(balanceInfo.advanceAmount)})` : formatPKR(balanceInfo.currentBalance)}*`;

  // 1. Android / Native Capacitor flow: Save PDF locally and trigger native Share sheet with PDF file attached
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(pdfBlob);
      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: `Ledger - ${party.name}`,
        text: summaryText,
        files: [saved.uri],
        dialogTitle: 'Share Ledger via WhatsApp or other apps',
      });

      return {
        sharedViaWebShare: true,
        downloadTriggered: false,
        message: 'Share dialog opened with PDF attached.',
      };
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('canceled') ||
        err?.message?.includes('cancelled')
      ) {
        return {
          sharedViaWebShare: false,
          downloadTriggered: false,
          message: 'Share cancelled by user.',
        };
      }
      console.warn('Native Capacitor share failed, falling back:', err);
    }
  }

  // 2. Check if navigator.share with files is supported (modern mobile browsers e.g. Android Chrome, iOS Safari)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Ledger - ${party.name}`,
          text: summaryText,
          files: [pdfFile],
        });
        return {
          sharedViaWebShare: true,
          downloadTriggered: false,
          message: 'Ledger PDF shared successfully via system sheet.',
        };
      } else {
        // Share text if file sharing is not supported
        await navigator.share({
          title: `Ledger - ${party.name}`,
          text: summaryText,
        });
        return {
          sharedViaWebShare: true,
          downloadTriggered: false,
          message: 'Ledger summary shared successfully.',
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          sharedViaWebShare: false,
          downloadTriggered: false,
          message: 'Share cancelled by user.',
        };
      }
      console.warn('Browser share failed, falling back to download:', err);
    }
  }

  // 2. Reliable Fallback: Download the file and provide direct WhatsApp link option
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // If party has a phone number, prepare WhatsApp web link fallback
  if (party.phone) {
    const cleanPhone = party.phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(summaryText)}`;
    window.open(waUrl, '_blank');
  }

  return {
    sharedViaWebShare: false,
    downloadTriggered: true,
    message: 'PDF downloaded. You can now share it directly through WhatsApp.',
  };
}
