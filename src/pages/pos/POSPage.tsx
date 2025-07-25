import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../store/posStore';
import { LoginPage } from './LoginPage';
import { POSLayout } from './POSLayout';
import { DashboardView } from './views/DashboardView';
import { MenuView } from './views/MenuView';
import { TablesView } from './views/TablesView';
import { OrdersView } from './views/OrdersView';
import { KitchenView } from './views/KitchenView';
import { PaymentModal } from './components/PaymentModal';
import { ShiftModal } from './components/ShiftModal';
import { OrderPanel } from './components/OrderPanel';
import toast from 'react-hot-toast';

export function POSPage() {
  const {
    currentUser,
    currentShift,
    loading,
    fetchData
  } = usePOSStore();

  const [activeView, setActiveView] = useState('dashboard');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchData();
      // Auto-show shift modal for staff roles
      if (!currentShift && ['server', 'bartender', 'cashier'].includes(currentUser.role)) {
        setTimeout(() => setShowShiftModal(true), 1000);
      }
    }
  }, [currentUser, fetchData]);

  const handlePayment = (order) => {
    setPaymentOrder(order);
    setShowPaymentModal(true);
  };

  if (!currentUser) {
    return <LoginPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-xl">Loading POS System...</p>
          <p className="text-gray-400 mt-2">Please wait while we prepare everything</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'menu':
        return <MenuView />;
      case 'tables':
        return <TablesView />;
      case 'orders':
        return <OrdersView onPayment={handlePayment} />;
      case 'kitchen':
        return <KitchenView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <POSLayout 
      activeView={activeView} 
      onViewChange={setActiveView}
      onStartShift={() => setShowShiftModal(true)}
    >
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>

        {/* Order Panel - Show only on menu and tables views */}
        {(activeView === 'menu' || activeView === 'tables') && (
          <div className="w-96 border-l border-gray-200 bg-white">
            <OrderPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      {showShiftModal && (
        <ShiftModal onClose={() => setShowShiftModal(false)} />
      )}

      {showPaymentModal && paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentOrder(null);
          }}
        />
      )}
    </POSLayout>
  );
}