import React from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Clock, Users, DollarSign, CheckCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  sent_to_kitchen: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-gray-100 text-gray-800',
  paid: 'bg-purple-100 text-purple-800',
  unknown: 'bg-red-100 text-red-800' // Fallback for unknown statuses
};

interface OrdersPanelProps {
  onPayment: (order: any) => void;
}

export function OrdersPanel({ onPayment }: OrdersPanelProps) {
  const { orders, sendToKitchen } = usePOSStore();

  const handleSendToKitchen = async (orderId: string) => {
    try {
      await sendToKitchen(orderId);
    } catch (error) {
      console.error('Error sending to kitchen:', error);
    }
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Active Orders</h2>
        <p className="text-gray-600">Manage current orders and payments</p>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className="font-semibold text-lg text-gray-900">
                  {order.order_number}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.unknown}`}>
                  {(order.status || 'unknown').replace('_', ' ')}
                </span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {order.currency} {order.total_amount.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {format(new Date(order.created_at), 'HH:mm')}
              </div>
              {order.table && (
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Table {order.table.number}
                </div>
              )}
              <div className="col-span-2">
                <span className="capitalize">{order.order_type.replace('_', ' ')}</span>
                {order.customer_name && ` • ${order.customer_name}`}
              </div>
            </div>

            {order.items?.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                <div className="space-y-1">
                  {order.items.map(item => (
                    item.menu_item?.name && item.quantity > 0 ? (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.menu_item.name}
                        </span>
                        <span>{order.currency} {item.total_price.toFixed(2)}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              {order.status === 'open' && (
                <button
                  onClick={() => handleSendToKitchen(order.id)}
                  className="flex-1 py-2 px-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send to Kitchen
                </button>
              )}
              
              {(order.status === 'ready' || order.status === 'served') && (
                <button
                  onClick={() => onPayment(order)}
                  className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Process Payment
                </button>
              )}
              
              {order.status === 'paid' && (
                <div className="flex-1 py-2 px-3 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No active orders</p>
        </div>
      )}
    </div>
  );
}