import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type {
  Party,
  PartyInvoice,
  PartyPayment,
  Company,
  CompanyInvoice,
  CompanyPayment,
  DailyCollectionSummary,
} from '../types';
import {
  calculatePartyPeriodLedger,
  calculateCompanyPeriodLedger,
  formatPKR,
  formatDateDisplay,
  getTodayDateString,
  formatLocalTime,
} from './accounting';

export interface PDFExportResult {
  pdfBlob: Blob;
  filename: string;
}

/**
 * Generates an offline professional PDF ledger statement for a party
 */
export function generatePartyLedgerPDF(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  salesmanName = 'Sales Representative',
  startDate?: string,
  endDate?: string
): PDFExportResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const periodLedger = calculatePartyPeriodLedger(party.id, invoices, payments, startDate, endDate);
  const isDateRange = periodLedger.isDateRange;
  const filteredEntries = periodLedger.entries;

  // Helper to format date in standard DD-MM-YYYY format
  const formatPeriodDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return formatDateDisplay(dateStr);
  };

  // Determine starting and ending dates from filters or transactions
  const effectiveStartDate =
    startDate ||
    (filteredEntries.length > 0
      ? filteredEntries[0].date
      : party.createdAt
      ? party.createdAt.split('T')[0]
      : getTodayDateString());

  const effectiveEndDate =
    endDate ||
    (filteredEntries.length > 0
      ? filteredEntries[filteredEntries.length - 1].date
      : getTodayDateString());

  const periodText = `${formatPeriodDate(effectiveStartDate)} to ${formatPeriodDate(effectiveEndDate)}`;

  // Palette colors
  const primaryColor = [15, 23, 42]; // slate-900
  const secondaryColor = [2, 132, 199]; // sky-600
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 25, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LOGIN SMART TECHNOLOGY', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SALESMAN / PARTY LEDGER STATEMENT', 14, 19);

  doc.setFontSize(9);
  doc.text(`Salesman: ${salesmanName}`, 196, 12, { align: 'right' });
  doc.text(`Generated: ${formatDateDisplay(getTodayDateString())}`, 196, 19, { align: 'right' });

  // 2. Party & Statement Info Card
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 32, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 182, 28, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(party.name, 18, 41);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${party.phone || 'N/A'}`, 18, 47);
  if (party.address) {
    doc.text(`Address: ${party.address}`, 18, 53);
  }

  // Center: Statement Period
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Statement Period:', 105, 41, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(periodText, 105, 48, { align: 'center' });

  // 3. Outstanding Balance / Closing Balance Highlight Box
  const isAdvance = periodLedger.isClosingAdvance;
  const balanceLabel = isAdvance
    ? 'Advance'
    : (isDateRange ? 'Closing Balance' : 'Remaining Amount');
  const balanceValue = isAdvance
    ? formatPKR(Math.abs(periodLedger.closingBalance))
    : formatPKR(periodLedger.closingBalance);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(balanceLabel, 192, 41, { align: 'right' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  if (isAdvance) {
    doc.setTextColor(16, 185, 129); // Green for advance
  } else {
    doc.setTextColor(220, 38, 38); // Red for outstanding
  }
  doc.text(balanceValue, 192, 49, { align: 'right' });

  // 4. Ledger Table using AutoTable
  const tableRows: any[][] = [];

  // Prepend Opening Balance row if this is a custom date range report with a start date
  if (startDate) {
    const openingFormatted = periodLedger.isOpeningAdvance
      ? `(Adv: ${formatPKR(Math.abs(periodLedger.openingBalance))})`
      : formatPKR(periodLedger.openingBalance);

    tableRows.push([
      formatDateDisplay(startDate),
      'Opening Balance',
      '-',
      '-',
      openingFormatted,
    ]);
  }

  for (const row of filteredEntries) {
    tableRows.push([
      formatDateDisplay(row.date),
      row.description,
      row.debit > 0 ? formatPKR(row.debit) : '-',
      row.credit > 0 ? formatPKR(row.credit) : '-',
      row.balance < 0 ? `(Adv: ${formatPKR(Math.abs(row.balance))})` : formatPKR(row.balance),
    ]);
  }

  if (tableRows.length === 0) {
    tableRows.push(['-', 'No transactions recorded', '-', '-', formatPKR(0)]);
  }

  autoTable(doc, {
    startY: 66,
    head: [['Date', 'Description / Reference', 'Amount Added (+)', 'Payment Received (-)', 'Remaining Amount']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} • Login Smart Technology Ledger`,
        105,
        290,
        { align: 'center' }
      );
    },
  });

  // Calculate position for summary card after the table
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If near bottom of page, add a new page for totals
  let summaryY = finalY;
  if (finalY + 35 > pageHeight) {
    doc.addPage();
    summaryY = 20;
  }

  // 5. Summary Footer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, summaryY, 182, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, summaryY, 182, 26, 2, 2, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  if (startDate) {
    // 4-Column Layout for Date-Range report:
    // Opening Balance | Period Invoices | Period Payments | Closing Balance
    doc.text('Opening Balance:', 18, summaryY + 8);
    doc.text('Invoices (Period):', 62, summaryY + 8);
    doc.text('Payments (Period):', 110, summaryY + 8);
    doc.text('Closing Balance:', 156, summaryY + 8);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    const openBalStr = periodLedger.isOpeningAdvance
      ? `Adv: ${formatPKR(Math.abs(periodLedger.openingBalance))}`
      : formatPKR(periodLedger.openingBalance);
    doc.text(openBalStr, 18, summaryY + 18);

    doc.text(formatPKR(periodLedger.periodInvoicesTotal), 62, summaryY + 18);
    doc.text(formatPKR(periodLedger.periodPaymentsTotal), 110, summaryY + 18);

    if (periodLedger.isClosingAdvance) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Adv: ${formatPKR(Math.abs(periodLedger.closingBalance))}`, 156, summaryY + 18);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatPKR(periodLedger.closingBalance), 156, summaryY + 18);
    }
  } else {
    // 3-Column Layout for Full Ledger:
    // Total Invoices (Amount Added) | Total Payments Received | Remaining Amount
    doc.text('Total Invoices (Amount Added):', 20, summaryY + 8);
    doc.text('Total Payments Received:', 80, summaryY + 8);
    doc.text('Remaining Amount:', 140, summaryY + 8);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPKR(periodLedger.periodInvoicesTotal), 20, summaryY + 18);
    doc.text(formatPKR(periodLedger.periodPaymentsTotal), 80, summaryY + 18);

    if (periodLedger.isClosingAdvance) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Adv: ${formatPKR(Math.abs(periodLedger.closingBalance))}`, 140, summaryY + 18);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatPKR(periodLedger.closingBalance), 140, summaryY + 18);
    }
  }

  const safePartyName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = startDate && endDate
    ? `Ledger_${safePartyName}_${formatDateDisplay(startDate)}_to_${formatDateDisplay(endDate)}.pdf`
    : `Ledger_${safePartyName}_${formatDateDisplay(getTodayDateString())}.pdf`;

  const pdfBlob = doc.output('blob');
  return { pdfBlob, filename };
}

/**
 * Converts a Blob to a base64 encoded string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface SavePDFResult {
  success: boolean;
  path?: string;
  message: string;
}

/**
 * Saves a PDF to the local device storage under the 'Smart Technology' folder on Android
 * or triggers file download in desktop browser.
 */
export async function savePDFToMobile(
  blob: Blob,
  filename: string
): Promise<SavePDFResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      let fileUri = '';

      try {
        const saved = await Filesystem.writeFile({
          path: `Smart Technology/Data/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        fileUri = saved.uri;
      } catch {
        const saved = await Filesystem.writeFile({
          path: `Smart Technology/Data/${filename}`,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        fileUri = saved.uri;
      }

      return {
        success: true,
        path: fileUri,
        message: `PDF saved successfully to Smart Technology/Data/${filename}`,
      };
    } catch (err: any) {
      console.error('Failed to save PDF locally:', err);
      return {
        success: false,
        message: `Failed to save PDF: ${err.message || err}`,
      };
    }
  } else {
    // Standard Browser Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return {
      success: true,
      message: `PDF downloaded: ${filename}`,
    };
  }
}

/**
 * Shares the actual generated PDF as a FILE ATTACHMENT on WhatsApp (Strictly NO text-ledger).
 */
export async function sharePDFOnWhatsApp(
  blob: Blob,
  filename: string,
  _partyPhone?: string
): Promise<SavePDFResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      let fileUri = '';

      try {
        const saved = await Filesystem.writeFile({
          path: `Smart Technology/Data/${filename}`,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        fileUri = saved.uri;
      } catch {
        const saved = await Filesystem.writeFile({
          path: `Smart Technology/Data/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        fileUri = saved.uri;
      }

      // Invoke Android native share sheet to attach the actual PDF file to WhatsApp
      try {
        await Share.share({
          title: filename,
          url: fileUri,
          dialogTitle: 'Send PDF on WhatsApp',
        });
      } catch (shareErr: any) {
        if (shareErr?.name !== 'AbortError') {
          console.warn('WhatsApp PDF share dismissed or error:', shareErr);
        }
      }

      return {
        success: true,
        path: fileUri,
        message: 'Opening WhatsApp to send PDF attachment...',
      };
    } catch (err: any) {
      console.error('Failed to share PDF on WhatsApp:', err);
      return {
        success: false,
        message: `Failed to share PDF on WhatsApp: ${err.message || err}`,
      };
    }
  } else {
    // Desktop / Browser fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'PDF downloaded for WhatsApp attachment.',
    };
  }
}

/**
 * General PDF saving helper (delegates to savePDFToMobile)
 */
export async function saveOrDownloadPDF(
  blob: Blob,
  filename: string
): Promise<SavePDFResult> {
  return await savePDFToMobile(blob, filename);
}

/**
 * Exports Party Ledger PDF with the selected destination: 'mobile' (Save to Mobile) or 'whatsapp' (Send on WhatsApp)
 */
export async function exportPartyLedgerPDF(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  destination: 'mobile' | 'whatsapp',
  salesmanName?: string,
  startDate?: string,
  endDate?: string
): Promise<SavePDFResult> {
  const { pdfBlob, filename } = generatePartyLedgerPDF(party, invoices, payments, salesmanName, startDate, endDate);
  if (destination === 'whatsapp') {
    return await sharePDFOnWhatsApp(pdfBlob, filename, party.phone);
  }
  return await savePDFToMobile(pdfBlob, filename);
}

/**
 * Trigger download/save of the generated Party Ledger PDF (legacy/direct helper)
 */
export async function downloadPartyLedgerPDF(
  party: Party,
  invoices: PartyInvoice[],
  payments: PartyPayment[],
  salesmanName?: string,
  startDate?: string,
  endDate?: string
): Promise<SavePDFResult> {
  return await exportPartyLedgerPDF(party, invoices, payments, 'mobile', salesmanName, startDate, endDate);
}

/**
 * Generates an offline professional PDF ledger statement for a Company / Supplier
 */
export function generateCompanyLedgerPDF(
  company: Company,
  invoices: (PartyInvoice | CompanyInvoice)[],
  payments: (PartyPayment | CompanyPayment)[],
  salesmanName = 'Business Ledger',
  startDate?: string,
  endDate?: string
): PDFExportResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const periodLedger = calculateCompanyPeriodLedger(company.id, invoices, payments, startDate, endDate);
  const isDateRange = periodLedger.isDateRange;
  const filteredEntries = periodLedger.entries;

  // Helper to format date in standard DD-MM-YYYY format
  const formatPeriodDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return formatDateDisplay(dateStr);
  };

  const effectiveStartDate =
    startDate ||
    (filteredEntries.length > 0
      ? filteredEntries[0].date
      : company.createdAt
      ? company.createdAt.split('T')[0]
      : getTodayDateString());

  const effectiveEndDate =
    endDate ||
    (filteredEntries.length > 0
      ? filteredEntries[filteredEntries.length - 1].date
      : getTodayDateString());

  const periodText = `${formatPeriodDate(effectiveStartDate)} to ${formatPeriodDate(effectiveEndDate)}`;

  const primaryColor = [15, 23, 42]; // slate-900
  const secondaryColor = [79, 70, 229]; // indigo-600
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 25, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LOGIN SMART TECHNOLOGY', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPANY / SUPPLIER LEDGER STATEMENT', 14, 19);

  doc.setFontSize(9);
  doc.text(`Account: ${salesmanName}`, 196, 12, { align: 'right' });
  doc.text(`Generated: ${formatDateDisplay(getTodayDateString())}`, 196, 19, { align: 'right' });

  // 2. Company & Statement Info Card
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 32, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 182, 28, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 18, 41);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${company.phone || 'N/A'}`, 18, 47);
  if (company.address) {
    doc.text(`Address: ${company.address}`, 18, 53);
  }

  // Center: Statement Period
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Statement Period:', 105, 41, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(periodText, 105, 48, { align: 'center' });

  // 3. Outstanding / Closing Balance Box
  const isAdvance = periodLedger.isClosingAdvance;
  const balanceLabel = isAdvance
    ? 'Advance'
    : (isDateRange ? 'Closing Balance' : 'Remaining Amount');
  const balanceValue = isAdvance
    ? formatPKR(Math.abs(periodLedger.closingBalance))
    : formatPKR(periodLedger.closingBalance);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(balanceLabel, 192, 41, { align: 'right' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  if (isAdvance) {
    doc.setTextColor(16, 185, 129); // Green
  } else {
    doc.setTextColor(220, 38, 38); // Red
  }
  doc.text(balanceValue, 192, 49, { align: 'right' });

  // 4. Detailed Transactions Table
  const tableRows: any[] = [];

  if (isDateRange && startDate) {
    const openingLabel = `Opening Balance (Prior to ${formatDateDisplay(startDate)})`;
    const openVal = periodLedger.isOpeningAdvance
      ? `(Adv: ${formatPKR(Math.abs(periodLedger.openingBalance))})`
      : formatPKR(periodLedger.openingBalance);

    tableRows.push([
      formatDateDisplay(startDate),
      openingLabel,
      '-',
      '-',
      openVal,
    ]);
  }

  for (const row of filteredEntries) {
    tableRows.push([
      formatDateDisplay(row.date),
      row.description,
      row.debit > 0 ? formatPKR(row.debit) : '-',
      row.credit > 0 ? formatPKR(row.credit) : '-',
      row.balance < 0 ? `(Adv: ${formatPKR(Math.abs(row.balance))})` : formatPKR(row.balance),
    ]);
  }

  if (tableRows.length === 0) {
    tableRows.push(['-', 'No transactions recorded', '-', '-', formatPKR(0)]);
  }

  autoTable(doc, {
    startY: 66,
    head: [['Date', 'Description / Reference', 'Purchases / Bills (+)', 'Payments Made (-)', 'Remaining Amount']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} • Login Smart Technology Business Ledger`,
        105,
        290,
        { align: 'center' }
      );
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  let summaryY = finalY;
  if (finalY + 35 > pageHeight) {
    doc.addPage();
    summaryY = 20;
  }

  // 5. Summary Footer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, summaryY, 182, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, summaryY, 182, 26, 2, 2, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  if (startDate) {
    doc.text('Opening Balance:', 18, summaryY + 8);
    doc.text('Purchases (Period):', 62, summaryY + 8);
    doc.text('Payments (Period):', 110, summaryY + 8);
    doc.text('Closing Balance:', 156, summaryY + 8);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    const openBalStr = periodLedger.isOpeningAdvance
      ? `Adv: ${formatPKR(Math.abs(periodLedger.openingBalance))}`
      : formatPKR(periodLedger.openingBalance);
    doc.text(openBalStr, 18, summaryY + 18);

    doc.text(formatPKR(periodLedger.periodInvoicesTotal), 62, summaryY + 18);
    doc.text(formatPKR(periodLedger.periodPaymentsTotal), 110, summaryY + 18);

    if (periodLedger.isClosingAdvance) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Adv: ${formatPKR(Math.abs(periodLedger.closingBalance))}`, 156, summaryY + 18);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatPKR(periodLedger.closingBalance), 156, summaryY + 18);
    }
  } else {
    doc.text('Total Purchases (Amount Added):', 20, summaryY + 8);
    doc.text('Total Payments Made:', 80, summaryY + 8);
    doc.text('Remaining Amount:', 140, summaryY + 8);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPKR(periodLedger.periodInvoicesTotal), 20, summaryY + 18);
    doc.text(formatPKR(periodLedger.periodPaymentsTotal), 80, summaryY + 18);

    if (periodLedger.isClosingAdvance) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Adv: ${formatPKR(Math.abs(periodLedger.closingBalance))}`, 140, summaryY + 18);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatPKR(periodLedger.closingBalance), 140, summaryY + 18);
    }
  }

  const safeCompanyName = company.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = startDate && endDate
    ? `CompanyLedger_${safeCompanyName}_${formatDateDisplay(startDate)}_to_${formatDateDisplay(endDate)}.pdf`
    : `CompanyLedger_${safeCompanyName}_${formatDateDisplay(getTodayDateString())}.pdf`;

  const pdfBlob = doc.output('blob');
  return { pdfBlob, filename };
}

/**
 * Exports Company Ledger PDF with destination: 'mobile' (Save to Mobile) or 'whatsapp' (Send on WhatsApp)
 */
export async function exportCompanyLedgerPDF(
  company: Company,
  invoices: (PartyInvoice | CompanyInvoice)[],
  payments: (PartyPayment | CompanyPayment)[],
  destination: 'mobile' | 'whatsapp',
  salesmanName?: string,
  startDate?: string,
  endDate?: string
): Promise<SavePDFResult> {
  const { pdfBlob, filename } = generateCompanyLedgerPDF(company, invoices, payments, salesmanName, startDate, endDate);
  if (destination === 'whatsapp') {
    return await sharePDFOnWhatsApp(pdfBlob, filename, company.phone);
  }
  return await savePDFToMobile(pdfBlob, filename);
}

/**
 * Generates a clean Daily Collection PDF report containing ONLY collection information.
 * Strictly excludes any Paisa Check, Collection Check, or Reconciliation sections.
 */
export function generateDailyCollectionPDF(
  collection: DailyCollectionSummary,
  arg2?: any,
  arg3?: string
): PDFExportResult {
  const salesmanName =
    typeof arg2 === 'string' ? arg2 : typeof arg3 === 'string' ? arg3 : 'Sales Representative';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [15, 23, 42]; // slate-900
  const secondaryColor = [16, 185, 129]; // emerald-500
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 25, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LOGIN SMART TECHNOLOGY', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('DAILY COLLECTION', 14, 19);

  doc.setFontSize(9);
  doc.text(`Salesman: ${salesmanName}`, 196, 12, { align: 'right' });
  doc.text(`Date: ${formatDateDisplay(collection.date)}`, 196, 19, { align: 'right' });

  // 2. Total Collection & Breakdown Card
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 32, 182, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 182, 38, 2, 2, 'S');

  // Top sub-header: Total Collection
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("TODAY'S COLLECTION", 20, 40);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formatPKR(collection.totalCollection), 20, 48);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`${collection.payments.length} party payment(s) received`, 190, 48, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 52, 190, 52);

  // Bottom row: Breakdown for Cash, Bank Account, Easypaisa, JazzCash, Other
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CASH', 20, 58);
  doc.text('BANK ACCOUNT', 54, 58);
  doc.text('EASYPAISA', 94, 58);
  doc.text('JAZZCASH', 132, 58);
  doc.text('OTHER', 166, 58);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPKR(collection.cashCollection), 20, 64);
  doc.text(formatPKR(collection.bankCollection), 54, 64);
  doc.text(formatPKR(collection.easypaisaCollection), 94, 64);
  doc.text(formatPKR(collection.jazzCashCollection), 132, 64);
  doc.text(formatPKR(collection.otherCollection), 166, 64);

  // 3. Table of Party Payments
  const partyRows = collection.payments.map((p, idx) => {
    const methodLabel = p.paymentMethod === 'Bank' ? 'Bank Account' : p.paymentMethod;
    const timeStr = p.createdAt ? formatLocalTime(p.createdAt) : '';
    const dateTimeStr = timeStr ? `${formatDateDisplay(p.date)} ${timeStr}` : formatDateDisplay(p.date);
    const refOrNote = [p.reference ? `Ref: ${p.reference}` : '', p.note ? p.note : '']
      .filter(Boolean)
      .join(' • ') || '-';

    return [
      String(idx + 1),
      p.partyName,
      methodLabel,
      dateTimeStr,
      refOrNote,
      formatPKR(p.amount),
    ];
  });

  if (partyRows.length === 0) {
    partyRows.push(['-', 'No party payments received on this date', '-', '-', '-', 'Rs 0']);
  }

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Party Name', 'Payment Method', 'Time / Date', 'Ref / Note', 'Amount']],
    body: partyRows,
    foot: [['', 'Total Collection', '', '', '', formatPKR(collection.totalCollection)]],
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [16, 185, 129],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 'auto', halign: 'left' },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Bottom Total Box
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();
  let summaryY = finalY;
  if (finalY + 25 > pageHeight) {
    doc.addPage();
    summaryY = 20;
  }

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, summaryY, 182, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, summaryY, 182, 16, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Collection:', 20, summaryY + 10.5);

  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text(formatPKR(collection.totalCollection), 190, summaryY + 10.5, { align: 'right' });

  // Footer page number
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} • Login Smart Technology Salesman Daily Ledger`,
      105,
      290,
      { align: 'center' }
    );
  }

  const filename = `Daily_Collection_${formatDateDisplay(collection.date)}.pdf`;
  const pdfBlob = doc.output('blob');
  return { pdfBlob, filename };
}

/**
 * Trigger download/save of Daily Collection PDF
 */
export async function downloadDailyCollectionPDF(
  collection: DailyCollectionSummary,
  arg2?: any,
  arg3?: string
): Promise<SavePDFResult> {
  const { pdfBlob, filename } = generateDailyCollectionPDF(collection, arg2, arg3);
  return await saveOrDownloadPDF(pdfBlob, filename);
}


