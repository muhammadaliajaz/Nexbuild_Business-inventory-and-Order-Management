import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Sidebar, type NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { InventoryPage } from './pages/InventoryPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { Loader2 } from 'lucide-react';

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  inventory: 'Stock Movements',
  suppliers: 'Suppliers',
  customers: 'Customers',
  reports: 'Reports',
  users: 'Team Members',
};

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading NexTech Operations...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const currentTab = activeTab === 'users' && user.role !== 'admin' ? 'dashboard' : activeTab;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-slate-200">
      <Sidebar
        activeTab={currentTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title={TAB_TITLES[currentTab]}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
            {currentTab === 'products' && <ProductsPage />}
            {currentTab === 'orders' && <OrdersPage />}
            {currentTab === 'inventory' && <InventoryPage />}
            {currentTab === 'suppliers' && <SuppliersPage />}
            {currentTab === 'customers' && <CustomersPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'users' && <UsersPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
