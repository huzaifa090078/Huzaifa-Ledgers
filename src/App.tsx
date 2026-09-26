import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { db, ensureActiveDatabasePopulated } from './db';
import type {
  Party,
  PartyInvoice,
  PartyPayment,
  Company,
  CompanyPayment,
  DailyReconciliation,
} from './types';
import type { NavTab } from './components/BottomNav';
import { BottomNav } from './components/BottomNav';
import { initAutoBackupSystem } from './services/autoBackup';
import { checkCompanyInvoiceUniqueness } from './services/accounting';

// Pages
import { Dashboard } from './pages/Dashboard';
import { DailyCollection } from './pages/DailyCollection';
import { Parties } from './pages/Parties';
import { PartyDetail } from './pages/PartyDetail';
import { Company as CompanyPage } from './pages/Company';
import { CompanyDetail } from './pages/CompanyDetail';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

// Modals
import { AddEditPartyModal } from './components/modals/AddEditPartyModal';
import { AddEditInvoiceModal } from './components/modals/AddEditInvoiceModal';
import { RecordPartyPaymentModal } from './components/modals/RecordPartyPaymentModal';
import { RecordCompanyPaymentModal } from './components/modals/RecordCompanyPaymentModal';
import { AddEditCompanyModal } from './components/modals/AddEditCompanyModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Live Queries directly from IndexedDB
  const parties = useLiveQuery(() => db.parties.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const partyPayments = useLiveQuery(() => db.partyPayments.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const companyPayments = useLiveQuery(() => db.companyPayments.toArray(), []) || [];
  const dailyReconciliations = useLiveQuery(() => db.dailyReconciliations.toArray(), []) || [];

  // Party Modals Visibility & Editing State
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PartyInvoice | null>(null);
  const [invoiceDefaultPartyId, setInvoiceDefaultPartyId] = useState<string | undefined>();
  const [invoiceDefaultCompanyId, setInvoiceDefaultCompanyId] = useState<string | undefined>();

  const [isPartyPaymentModalOpen, setIsPartyPaymentModalOpen] = useState(false);
  const [editingPartyPayment, setEditingPartyPayment] = useState<PartyPayment | null>(null);
  const [paymentDefaultPartyId, setPaymentDefaultPartyId] = useState<string | undefined>();

  // Company Modals Visibility & Editing State
  const [isCompanyPaymentModalOpen, setIsCompanyPaymentModalOpen] = useState(false);
  const [editingCompanyPayment, setEditingCompanyPayment] = useState<CompanyPayment | null>(null);
  const [companyPaymentDefaultCompanyId, setCompanyPaymentDefaultCompanyId] = useState<string | undefined>();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Generic Delete Confirmation State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    warningNote?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Navigation history stack: keeps track of screens { tab, partyId, companyId }
  const navHistoryRef = useRef<Array<{ tab: NavTab; partyId: string | null; companyId: string | null }>>([
    { tab: 'dashboard', partyId: null, companyId: null },
  ]);

  // Keep latest mutable state in a ref to avoid stale closures in event listeners
  const stateRef = useRef({
    activeTab,
    selectedPartyId,
    selectedCompanyId,
    isPartyModalOpen,
    isInvoiceModalOpen,
    isPartyPaymentModalOpen,
    isCompanyPaymentModalOpen,
    isCompanyModalOpen,
    deleteModalOpen: deleteModalState.isOpen,
  });

  stateRef.current = {
    activeTab,
    selectedPartyId,
    selectedCompanyId,
    isPartyModalOpen,
    isInvoiceModalOpen,
    isPartyPaymentModalOpen,
    isCompanyPaymentModalOpen,
    isCompanyModalOpen,
    deleteModalOpen: deleteModalState.isOpen,
  };

  const pushHistory = useCallback((tab: NavTab, partyId: string | null, companyId: string | null) => {
    const history = navHistoryRef.current;
    const last = history[history.length - 1];
    if (!last || last.tab !== tab || last.partyId !== partyId || last.companyId !== companyId) {
      history.push({ tab, partyId, companyId });
      if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && window.history) {
        window.history.pushState({ tab, partyId, companyId }, '');
      }
    }
  }, []);

  const handleTabChange = useCallback((newTab: NavTab) => {
    setSelectedPartyId(null);
    setSelectedCompanyId(null);
    setActiveTab(newTab);
    pushHistory(newTab, null, null);
  }, [pushHistory]);

  const handleSelectParty = useCallback((partyId: string) => {
    setSelectedPartyId(partyId);
    pushHistory(stateRef.current.activeTab, partyId, null);
  }, [pushHistory]);

  const handleSelectCompany = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId);
    pushHistory('company', null, companyId);
  }, [pushHistory]);

  const handleBack = useCallback((): boolean => {
    // 1. Dispatch custom event for child components with local dialogs (e.g. PDF modal in details)
    const event = new CustomEvent('app:back', { cancelable: true });
    window.dispatchEvent(event);
    if (event.defaultPrevented) {
      return true;
    }

    // 2. Check open modals in App (highest overlay to lowest)
    if (stateRef.current.deleteModalOpen) {
      setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
      return true;
    }
    if (stateRef.current.isCompanyPaymentModalOpen) {
      setIsCompanyPaymentModalOpen(false);
      return true;
    }
    if (stateRef.current.isCompanyModalOpen) {
      setIsCompanyModalOpen(false);
      return true;
    }
    if (stateRef.current.isPartyModalOpen) {
      setIsPartyModalOpen(false);
      return true;
    }
    if (stateRef.current.isInvoiceModalOpen) {
      setIsInvoiceModalOpen(false);
      return true;
    }
    if (stateRef.current.isPartyPaymentModalOpen) {
      setIsPartyPaymentModalOpen(false);
      return true;
    }

    // 3. Check navigation history
    const history = navHistoryRef.current;
    if (history.length > 1) {
      history.pop(); // Remove current screen
      const previous = history[history.length - 1];
      setActiveTab(previous.tab);
      setSelectedPartyId(previous.partyId);
      setSelectedCompanyId(previous.companyId);
      return true;
    }

    // 4. If viewing company details without history stack, return to company list
    if (stateRef.current.selectedCompanyId) {
      setSelectedCompanyId(null);
      return true;
    }

    // 5. If viewing party details without history stack, return to party list
    if (stateRef.current.selectedPartyId) {
      setSelectedPartyId(null);
      return true;
    }

    // 6. If on another tab, return to Dashboard first before exit
    if (stateRef.current.activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      setSelectedPartyId(null);
      setSelectedCompanyId(null);
      navHistoryRef.current = [{ tab: 'dashboard', partyId: null, companyId: null }];
      return true;
    }

    // 7. Already at root Dashboard with no modals and no history -> exit
    return false;
  }, []);

  useEffect(() => {
    let backListener: { remove: () => void } | null = null;

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        const handled = handleBack();
        if (!handled) {
          CapacitorApp.exitApp();
        }
      }).then((listener) => {
        backListener = listener;
      });
    } else {
      // Browser environment back navigation support
      const onPopState = () => {
        handleBack();
      };
      window.addEventListener('popstate', onPopState);
      return () => {
        window.removeEventListener('popstate', onPopState);
      };
    }

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [handleBack]);

  // Initialize active database from verified backup if empty, and start auto-backup engine
  useEffect(() => {
    ensureActiveDatabasePopulated().catch((err) => {
      console.warn('Initial backup population check:', err);
    });
    initAutoBackupSystem();
  }, []);

  // Selected Party object if in party detail view
  const selectedParty = selectedPartyId ? parties.find((p) => p.id === selectedPartyId) : null;

  // Selected Company object if in company detail view
  const selectedCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) : null;

  // --- Handlers for Parties ---
  const handleSaveParty = async (party: Party) => {
    await db.parties.put(party);
  };

  const handleOpenAddParty = () => {
    setEditingParty(null);
    setIsPartyModalOpen(true);
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setIsPartyModalOpen(true);
  };

  const handleDeleteParty = (party: Party, hasTransactions: boolean) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Party',
      message: `Are you sure you want to permanently delete "${party.name}"?`,
      warningNote: hasTransactions
        ? 'This party has recorded invoices or payments! Deleting this party will also permanently delete its linked invoices and payment history.'
        : undefined,
      action: async () => {
        await db.transaction('rw', [db.parties, db.invoices, db.partyPayments], async () => {
          await db.parties.delete(party.id);
          await db.invoices.where('partyId').equals(party.id).delete();
          await db.partyPayments.where('partyId').equals(party.id).delete();
        });
        if (selectedPartyId === party.id) {
          setSelectedPartyId(null);
        }
      },
    });
  };

  // --- Handlers for Invoices ---
  const handleSaveInvoice = async (invoice: PartyInvoice) => {
    const uniqueness = checkCompanyInvoiceUniqueness(invoices, {
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      companyName: invoice.companyName,
      currentInvoiceId: invoice.id,
    });
    if (uniqueness.isDuplicate) {
      throw new Error(uniqueness.message);
    }
    await db.invoices.put(invoice);
  };

  const handleOpenAddInvoice = (partyId?: string, companyId?: string) => {
    setEditingInvoice(null);
    setInvoiceDefaultPartyId(partyId);
    setInvoiceDefaultCompanyId(companyId || (companies.length === 1 ? companies[0].id : undefined));
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: PartyInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceDefaultPartyId(invoice.partyId);
    setInvoiceDefaultCompanyId(invoice.companyId);
    setIsInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: PartyInvoice) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Invoice',
      message: `Are you sure you want to delete Invoice #${invoice.invoiceNumber} (Rs ${invoice.amount.toLocaleString()})?`,
      warningNote: 'Deleting this invoice will automatically update both Party and Company ledgers.',
      action: async () => {
        await db.transaction('rw', [db.invoices, db.companyInvoices], async () => {
          await db.invoices.delete(invoice.id);
          await db.companyInvoices.delete(invoice.id);
        });
      },
    });
  };

  // --- Handlers for Party Payments ---
  const handleSavePartyPayment = async (payment: PartyPayment) => {
    await db.partyPayments.put(payment);
  };

  const handleOpenRecordPartyPayment = (partyId?: string) => {
    setEditingPartyPayment(null);
    setPaymentDefaultPartyId(partyId);
    setIsPartyPaymentModalOpen(true);
  };

  const handleEditPartyPayment = (payment: PartyPayment) => {
    setEditingPartyPayment(payment);
    setPaymentDefaultPartyId(payment.partyId);
    setIsPartyPaymentModalOpen(true);
  };

  const handleDeletePartyPayment = (payment: PartyPayment) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Payment',
      message: `Are you sure you want to delete this payment of Rs ${payment.amount.toLocaleString()} received via ${payment.paymentMethod}?`,
      warningNote: 'Deleting this payment will automatically update the Party ledger.',
      action: async () => {
        await db.partyPayments.delete(payment.id);
      },
    });
  };

  // --- Handlers for Company Payments ---
  const handleSaveCompanyPayment = async (payment: CompanyPayment) => {
    await db.companyPayments.put(payment);
  };

  const handleOpenRecordCompanyPayment = (companyId?: string) => {
    setEditingCompanyPayment(null);
    setCompanyPaymentDefaultCompanyId(companyId || (companies.length === 1 ? companies[0].id : undefined));
    setIsCompanyPaymentModalOpen(true);
  };

  const handleEditCompanyPayment = (payment: CompanyPayment) => {
    setEditingCompanyPayment(payment);
    setCompanyPaymentDefaultCompanyId(payment.companyId);
    setIsCompanyPaymentModalOpen(true);
  };

  const handleDeleteCompanyPayment = (payment: CompanyPayment) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Company Payment',
      message: `Are you sure you want to delete this payment of Rs ${payment.amount.toLocaleString()} paid via ${payment.paymentMethod}?`,
      warningNote: 'Deleting this payment will automatically update the Company ledger.',
      action: async () => {
        await db.companyPayments.delete(payment.id);
      },
    });
  };

  // --- Handlers for Companies ---
  const handleSaveCompany = async (company: Company) => {
    await db.companies.put(company);
  };

  const handleOpenAddCompany = () => {
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleDeleteCompany = (company: Company, hasTransactions: boolean) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Company',
      message: `Are you sure you want to permanently delete "${company.name}"?`,
      warningNote: hasTransactions
        ? 'This company has recorded purchases or payments! Deleting this company will also permanently delete its linked purchases and payment history.'
        : undefined,
      action: async () => {
        await db.transaction('rw', [db.companies, db.invoices, db.companyInvoices, db.companyPayments], async () => {
          await db.companies.delete(company.id);
          await db.invoices.where('companyId').equals(company.id).delete();
          await db.companyInvoices.where('companyId').equals(company.id).delete();
          await db.companyPayments.where('companyId').equals(company.id).delete();
        });
        if (selectedCompanyId === company.id) {
          setSelectedCompanyId(null);
        }
      },
    });
  };

  // --- Handlers for Daily Reconciliation ---
  const handleSaveReconciliation = async (recon: DailyReconciliation) => {
    await db.dailyReconciliations.put(recon);
  };

  return (
    <div className="min-h-full flex-1 bg-slate-100 flex flex-col selection:bg-sky-600 selection:text-white">
      {/* Main Content Area constrained to mobile width */}
      <main className="flex-1 w-full max-w-md mx-auto px-3.5 pt-3.5 pb-20">
        {selectedParty ? (
          <PartyDetail
            party={selectedParty}
            invoices={invoices}
            partyPayments={partyPayments}
            onBack={handleBack}
            onOpenAddInvoice={handleOpenAddInvoice}
            onOpenRecordPayment={handleOpenRecordPartyPayment}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onEditPayment={handleEditPartyPayment}
            onDeletePayment={handleDeletePartyPayment}
          />
        ) : selectedCompany ? (
          <CompanyDetail
            company={selectedCompany}
            invoices={invoices}
            companyPayments={companyPayments}
            onBack={handleBack}
            onOpenAddInvoice={(compKey) => handleOpenAddInvoice(undefined, compKey)}
            onOpenRecordPayment={(compKey) => handleOpenRecordCompanyPayment(compKey)}
            onEditInvoice={(inv) => handleEditInvoice(inv as PartyInvoice)}
            onDeleteInvoice={(inv) => handleDeleteInvoice(inv as PartyInvoice)}
            onEditPayment={(pmt) => handleEditCompanyPayment(pmt)}
            onDeletePayment={(pmt) => handleDeleteCompanyPayment(pmt)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                companies={companies}
                companyInvoices={invoices}
                dailyReconciliations={dailyReconciliations}
                onOpenAddParty={handleOpenAddParty}
                onOpenAddInvoice={() => handleOpenAddInvoice()}
                onOpenRecordPartyPayment={() => handleOpenRecordPartyPayment()}
                onOpenRecordCompanyPayment={() => handleOpenRecordCompanyPayment()}
                onSelectParty={handleSelectParty}
                onNavigateToCompany={() => handleTabChange('company')}
                onNavigateToCollection={() => handleTabChange('collection')}
              />
            )}

            {activeTab === 'collection' && (
              <DailyCollection
                parties={parties}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                dailyReconciliations={dailyReconciliations}
                onSaveReconciliation={handleSaveReconciliation}
                onOpenRecordPartyPayment={() => handleOpenRecordPartyPayment()}
                onSelectParty={handleSelectParty}
              />
            )}

            {activeTab === 'parties' && (
              <Parties
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                onOpenAddParty={handleOpenAddParty}
                onEditParty={handleEditParty}
                onDeleteParty={handleDeleteParty}
                onSelectParty={handleSelectParty}
                onQuickAddInvoice={(partyKey) => handleOpenAddInvoice(partyKey)}
                onQuickRecordPayment={(partyKey) => handleOpenRecordPartyPayment(partyKey)}
              />
            )}

            {activeTab === 'company' && (
              <CompanyPage
                companies={companies}
                companyInvoices={invoices}
                companyPayments={companyPayments}
                onOpenAddCompany={handleOpenAddCompany}
                onEditCompany={handleEditCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
                onQuickAddInvoice={(compKey) => handleOpenAddInvoice(undefined, compKey)}
                onQuickRecordPayment={(compKey) => handleOpenRecordCompanyPayment(compKey)}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                companies={companies}
                companyInvoices={invoices}
                onSelectParty={handleSelectParty}
              />
            )}

            {activeTab === 'settings' && (
              <Settings
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                companies={companies}
                companyInvoices={invoices}
                onDataChanged={() => {
                  // Live queries will auto-update
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        partiesBadgeCount={parties.length}
      />

      {/* App Modals - Customer / Party */}
      <AddEditPartyModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSave={handleSaveParty}
        editingParty={editingParty}
      />

      <AddEditInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSave={handleSaveInvoice}
        parties={parties}
        companies={companies}
        invoices={invoices}
        defaultPartyId={invoiceDefaultPartyId}
        defaultCompanyId={invoiceDefaultCompanyId}
        editingInvoice={editingInvoice}
      />

      <RecordPartyPaymentModal
        isOpen={isPartyPaymentModalOpen}
        onClose={() => setIsPartyPaymentModalOpen(false)}
        onSave={handleSavePartyPayment}
        parties={parties}
        companies={companies}
        invoices={invoices}
        defaultPartyId={paymentDefaultPartyId}
        editingPayment={editingPartyPayment}
      />

      {/* App Modals - Universal Company / Supplier */}
      <AddEditCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={handleSaveCompany}
        editingCompany={editingCompany}
      />

      {/* App Modals - Company Payment */}
      <RecordCompanyPaymentModal
        isOpen={isCompanyPaymentModalOpen}
        onClose={() => setIsCompanyPaymentModalOpen(false)}
        onSave={handleSaveCompanyPayment}
        companies={companies}
        defaultCompanyId={companyPaymentDefaultCompanyId}
        editingPayment={editingCompanyPayment}
      />

      {/* Common Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModalState.action}
        title={deleteModalState.title}
        message={deleteModalState.message}
        warningNote={deleteModalState.warningNote}
      />
    </div>
  );
};

export default App;
