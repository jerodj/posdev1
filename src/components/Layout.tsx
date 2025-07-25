import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  BookOpen,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Accounting', href: '/accounting', icon: BookOpen },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
              <div className="flex items-center flex-shrink-0 px-4">
                <span className="text-xl font-semibold">Accounting System</span>
              </div>
              <div className="mt-5 flex-grow flex flex-col">
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          location.pathname === item.href
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        <Icon
                          className={`${
                            location.pathname === item.href
                              ? 'text-gray-500'
                              : 'text-gray-400 group-hover:text-gray-500'
                          } mr-3 h-5 w-5`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="ml-auto flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100"
                  >
                    <LogOut className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}