import React from 'react';
import { useAuthStore } from '../store/authStore';
import { BarChart3, DollarSign, Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome back, {user?.full_name}!</p>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">$0.00</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inventory Items</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Sales</h3>
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No sales data available</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Low Stock Items</h3>
          <div className="text-center text-gray-500 py-8">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No low stock items</p>
          </div>
        </div>
      </div>
    </div>
  );
}