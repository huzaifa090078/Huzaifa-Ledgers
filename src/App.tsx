import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { db } from './db';
import type { Party, PartyInvoice, PartyPayment, CompanyPayment, DailyReconciliation } from './types';
import type { NavTab } from './components/BottomNav';
import { BottomNav } from './components/BottomNav';

// Pages
import { Dashboard } from './pages/Dashboard';
import { DailyCollection } from './pages/DailyCollection';
import { Parties } from './pages/Parties';
import { PartyDetail } from './pages/PartyDetail';
import { Company } from './pages/Company';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

// Modals
import { AddEditPartyModal } from './components/modals/AddEditPartyModal';
import { AddEditInvoiceModal } from './components/modals/AddEditInvoiceModal';
import { RecordPartyPaymentModal } from './components/modals/RecordPartyPaymentModal';
import { RecordCompanyPaymentModal } from './components/modals/RecordCompanyPaymentModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  // Live Queries directly from IndexedDB
  const parties = useLiveQuery(() => db.parties.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const partyPayments = useLiveQuery(() => db.partyPayments.toArray(), []) || [];
  const companyPayments = useLiveQuery(() => db.companyPayments.toArray(), []) || [];
  const dailyReconciliations = useLiveQuery(() => db.dailyReconciliations.toArray(), []) || [];

  // Modals Visibility & Editing State
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PartyInvoice | null>(null);
  const [invoiceDefaultPartyId, setInvoiceDefaultPartyId] = useState<string | undefined>();

  const [isPartyPaymentModalOpen, setIsPartyPaymentModalOpen] = useState(false);
  const [editingPartyPayment, setEditingPartyPayment] = useState<PartyPayment | null>(null);
  const [paymentDefaultPartyId, setPaymentDefaultPartyId] = useState<string | undefined>();

  const [isCompanyPaymentModalOpen, setIsCompanyPaymentModalOpen] = useState(false);
  const [editingCompanyPayment, setEditingCompanyPayment] = useState<CompanyPayment | null>(null);

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

  // Navigation history stack: keeps track of screens { tab, partyId }
  const navHistoryRef = useRef<Array<{ tab: NavTab; partyId: string | null }>>([
    { tab: 'dashboard', partyId: null },
  ]);

  // Keep latest mutable state in a ref to avoid stale closures in event listeners
  const stateRef = useRef({
    activeTab,
    selectedPartyId,
    isPartyModalOpen,
    isInvoiceModalOpen,
    isPartyPaymentModalOpen,
    isCompanyPaymentModalOpen,
    deleteModalOpen: deleteModalState.isOpen,
  });

  stateRef.current = {
    activeTab,
    selectedPartyId,
    isPartyModalOpen,
    isInvoiceModalOpen,
    isPartyPaymentModalOpen,
    isCompanyPaymentModalOpen,
    deleteModalOpen: deleteModalState.isOpen,
  };

  const pushHistory = useCallback((tab: NavTab, partyId: string | null) => {
    const history = navHistoryRef.current;
    const last = history[history.length - 1];
    if (!last || last.tab !== tab || last.partyId !== partyId) {
      history.push({ tab, partyId });
      if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && window.history) {
        window.history.pushState({ tab, partyId }, '');
      }
    }
  }, []);

  const handleTabChange = useCallback((newTab: NavTab) => {
    setSelectedPartyId(null);
    setActiveTab(newTab);
    pushHistory(newTab, null);
  }, [pushHistory]);

  const handleSelectParty = useCallback((partyId: string) => {
    setSelectedPartyId(partyId);
    pushHistory(stateRef.current.activeTab, partyId);
  }, [pushHistory]);

  const handleBack = useCallback((): boolean => {
    // 1. Dispatch custom event for child components with local dialogs
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
    if (stateRef.current.isCompanyPaymentModalOpen) {
      setIsCompanyPaymentModalOpen(false);
      return true;
    }

    // 3. Check navigation history
    const history = navHistoryRef.current;
    if (history.length > 1) {
      history.pop(); // Remove current screen
      const previous = history[history.length - 1];
      setActiveTab(previous.tab);
      setSelectedPartyId(previous.partyId);
      return true;
    }

    // 4. If viewing party details without history stack, return to list
    if (stateRef.current.selectedPartyId) {
      setSelectedPartyId(null);
      return true;
    }

    // 5. If on another tab, return to Dashboard first before exit
    if (stateRef.current.activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      setSelectedPartyId(null);
      navHistoryRef.current = [{ tab: 'dashboard', partyId: null }];
      return true;
    }

    // 6. Already at root Dashboard with no modals and no history -> exit
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

  // Selected Party object if in party detail view
  const selectedParty = selectedPartyId ? parties.find((p) => p.id === selectedPartyId) : null;

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
    await db.invoices.put(invoice);
  };

  const handleOpenAddInvoice = (partyId?: string) => {
    setEditingInvoice(null);
    setInvoiceDefaultPartyId(partyId || (parties.length > 0 ? parties[0].id : undefined));
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: PartyInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceDefaultPartyId(invoice.partyId);
    setIsInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: PartyInvoice) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Company Invoice',
      message: `Are you sure you want to delete Invoice #${invoice.invoiceNumber} (Rs ${invoice.amount.toLocaleString()})?`,
      warningNote: 'Deleting this invoice will automatically reduce the party Amount Due and reduce your Amount Payable to Smart Technology.',
      action: async () => {
        await db.invoices.delete(invoice.id);
      },
    });
  };

  // --- Handlers for Party Payments ---
  const handleSavePartyPayment = async (payment: PartyPayment) => {
    await db.partyPayments.put(payment);
  };

  const handleOpenRecordPartyPayment = (partyId?: string) => {
    setEditingPartyPayment(null);
    setPaymentDefaultPartyId(partyId || (parties.length > 0 ? parties[0].id : undefined));
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
      title: 'Delete Party Payment',
      message: `Are you sure you want to delete this payment of Rs ${payment.amount.toLocaleString()} received via ${payment.paymentMethod}?`,
      warningNote: 'This will increase the party Remaining Amount. Amount Payable to the company remains unaffected.',
      action: async () => {
        await db.partyPayments.delete(payment.id);
      },
    });
  };

  // --- Handlers for Company Payments ---
  const handleSaveCompanyPayment = async (payment: CompanyPayment) => {
    await db.companyPayments.put(payment);
  };

  const handleOpenRecordCompanyPayment = () => {
    setEditingCompanyPayment(null);
    setIsCompanyPaymentModalOpen(true);
  };

  const handleEditCompanyPayment = (payment: CompanyPayment) => {
    setEditingCompanyPayment(payment);
    setIsCompanyPaymentModalOpen(true);
  };

  const handleDeleteCompanyPayment = (payment: CompanyPayment) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Company Payment',
      message: `Are you sure you want to delete this deposit of Rs ${payment.amount.toLocaleString()} paid to Smart Technology?`,
      warningNote: 'This will increase your Amount Payable to the company. Party Amount Due will remain unaffected.',
      action: async () => {
        await db.companyPayments.delete(payment.id);
      },
    });
  };

  // --- Handlers for Daily Reconciliation ---
  const handleSaveReconciliation = async (recon: DailyReconciliation) => {
    await db.dailyReconciliations.put(recon);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-sky-600 selection:text-white">

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
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                dailyReconciliations={dailyReconciliations}
                onOpenAddParty={handleOpenAddParty}
                onOpenAddInvoice={() => handleOpenAddInvoice()}
                onOpenRecordPartyPayment={() => handleOpenRecordPartyPayment()}
                onOpenRecordCompanyPayment={handleOpenRecordCompanyPayment}
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
                onQuickAddInvoice={handleOpenAddInvoice}
                onQuickRecordPayment={handleOpenRecordPartyPayment}
              />
            )}

            {activeTab === 'company' && (
              <Company
                invoices={invoices}
                companyPayments={companyPayments}
                onOpenRecordPayment={handleOpenRecordCompanyPayment}
                onEditPayment={handleEditCompanyPayment}
                onDeletePayment={handleDeleteCompanyPayment}
                onSelectParty={handleSelectParty}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
                onSelectParty={handleSelectParty}
              />
            )}

            {activeTab === 'settings' && (
              <Settings
                parties={parties}
                invoices={invoices}
                partyPayments={partyPayments}
                companyPayments={companyPayments}
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

      {/* App Modals */}
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
        defaultPartyId={invoiceDefaultPartyId}
        editingInvoice={editingInvoice}
      />

      <RecordPartyPaymentModal
        isOpen={isPartyPaymentModalOpen}
        onClose={() => setIsPartyPaymentModalOpen(false)}
        onSave={handleSavePartyPayment}
        parties={parties}
        defaultPartyId={paymentDefaultPartyId}
        editingPayment={editingPartyPayment}
      />

      <RecordCompanyPaymentModal
        isOpen={isCompanyPaymentModalOpen}
        onClose={() => setIsCompanyPaymentModalOpen(false)}
        onSave={handleSaveCompanyPayment}
        editingPayment={editingCompanyPayment}
      />

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

