import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Clock, Users, DollarSign, CheckCircle, Send, AlertTriangle, Filter } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig = {
  open: { color: 'bg-blue-100 text-blue-800', label: 'Open' },
  sent_to_kitchen: { color: 'bg-yellow-100 text-yellow-800', label: 'In Kitchen' },
  preparing: { color: 'bg-orange-100 text-orange-800', label: 'Preparing' },
  ready: { color: 'bg-green-100 text-green-800', label: 'Ready' },
  served: { color: 'bg-purple-100 text-purple-800', label: 'Served' },
  paid: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  unknown: { color: 'bg-gray-100 text-gray-800', label: 'Unknown' }
};

const priorityConfig = {
  low: { color: 'text-gray-500', label: 'Low' },
  normal: { color: 'text-blue-500', label: 'Normal' },
  high: { color: 'text-orange-500', label: 'High' },
  urgent: { color: 'text-red-500', label: 'Urgent' },
  unknown: { color: 'text-gray-500', label: 'Unknown' }
};

interface OrdersViewProps {
  onPayment: (order: any) => void;
}

export function OrdersView({ onPayment }: OrdersViewProps) {
  const { orders, sendToKitchen, loading } = usePOSStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'amount'>('time');

  const handleSendToKitchen = async (orderId: string) => {
    try {
      await sendToKitchen(orderId);
      toast.success('Order sent to kitchen!');
    } catch (error) {
      console.error('Error sending to kitchen:', error);
      toast.error(`Failed to send to kitchen: ${error.message}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredOrders = orders
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1, unknown: 0 };
          return priorityOrder[b.priority || 'unknown'] - priorityOrder[a.priority || 'unknown'];
        case 'amount':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'time':
        default:
          return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
      }
    });

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt || Date.now()).getTime();
    return Math.floor(elapsed / (1000 * 60)); // minutes
  };

  const isOrderUrgent = (order: any) => {
    const elapsedMinutes = getElapsedTime(order.created_at);
    return (order.priority === 'urgent' || elapsedMinutes > 30) && order.status !== 'paid' && order.status !== 'cancelled';
  };

  if (loading) {
    return <div>Loading POS System...</div>;
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600 mt-1">Track and manage all orders</p>
          </div>
          
          {/* Filters and Sort */}
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="time">Sort by Time</option>
              <option value="priority">Sort by Priority</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const statusInfo = statusConfig[order.status] || statusConfig.unknown;
            const priorityInfo = priorityConfig[order.priority] || priorityConfig.unknown;
            const elapsedMinutes = getElapsedTime(order.created_at);
            const isUrgent = isOrderUrgent(order);
            
            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                  isUrgent ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {order.order_number || 'Unknown Order'}
                      </h3>
                      {isUrgent && (
                        <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(order.total_amount || 0)}
                      </div>
                      <div className={`text-sm font-medium ${priorityInfo.color}`}>
                        {priorityInfo.label} Priority
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <div className="text-sm text-gray-500">
                      {elapsedMinutes}m ago
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6 space-y-4">
                  {/* Customer & Table Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {order.created_at ? format(new Date(order.created_at), 'HH:mm') : 'N/A'}
                      </span>
                    </div>
                    {order.table && (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Table {order.table.number}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-600 capitalize">
                        {order.order_type?.replace('_', ' ') || 'Unknown'}
                        {order.customer_name && ` • ${order.customer_name}`}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.quantity || 0}x {item.menu_item?.name || 'Unknown Item'}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(item.total_price || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Requests */}
                  {order.special_requests && (
                    <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Special Requests:</strong> {order.special_requests}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100">
                  <div className="flex space-x-3">
                    {order.status === 'open' && (
                      <button
                        onClick={() => handleSendToKitchen(order.id)}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all font-semibold flex items-center justify-center transform hover:scale-105"
                        disabled={loading}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send to Kitchen
                      </button>
                    )}
                    
                    {(order.status === 'ready' || order.status === 'served') && (
                      <button
                        onClick={() => onPayment(order)}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold flex items-center justify-center transform hover:scale-105"
                        disabled={loading}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Process Payment
                      </button>
                    )}
                    
                    {order.status === 'paid' && (
                      <div className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-semibold flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">No orders found</p>
            <p className="text-gray-400">
              {statusFilter === 'all' 
                ? 'Orders will appear here when customers place them'
                : `No orders with status "${statusConfig[statusFilter]?.label || 'Unknown'}"`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}