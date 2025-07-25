
import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { CreditCard, DollarSign, Smartphone, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  order: any;
  onClose: () => void;
}

export function PaymentModal({ order: initialOrder, onClose }: PaymentModalProps) {
  const { processPayment, fetchOrder, businessSettings } = usePOSStore();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [reference, setReference] = useState('');
  const [tip, setTip] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(initialOrder);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const fetchedOrder = await fetchOrder(initialOrder.id);
        console.log('PaymentModal fetched order:', fetchedOrder);
        setOrder(fetchedOrder);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to fetch order:', message);
        toast.error('Failed to load order details, using initial data');
        // Fallback to initialOrder
        setOrder(initialOrder);
      }
    };
    if (typeof fetchOrder === 'function') {
      loadOrder();
    } else {
      console.error('fetchOrder is not a function, using initialOrder');
      setOrder(initialOrder);
      toast.error('Order fetching unavailable, displaying initial data');
    }
  }, [initialOrder, fetchOrder]);

  const currency = businessSettings?.currency || 'UGX';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) {
      toast.error('No order data available');
      return;
    }
    if ((paymentMethod === 'card' || paymentMethod === 'mobile') && !reference.trim()) {
      toast.error('Reference number is required for card or mobile payments');
      return;
    }
    if (tip < 0) {
      toast.error('Tip amount cannot be negative');
      return;
    }
    setLoading(true);
    try {
      const paymentData = {
        orderId: order.id,
        paymentMethod,
        amount: order.total_amount,
        tip,
        reference: paymentMethod === 'cash' ? undefined : reference.trim(),
      };
      console.log('PaymentModal sending payment:', paymentData);
      await processPayment(
        order.id,
        paymentMethod,
        order.total_amount,
        tip,
        paymentMethod === 'cash' ? undefined : reference.trim()
      );
      toast.success('💰 Payment processed successfully!');
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Payment error:', message);
      toast.error(`Payment failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl text-center text-gray-500">
          Loading order details...
        </div>
      </div>
    );
  }

  const total = order.total_amount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl mr-4">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Process Payment</h2>
            <p className="text-gray-600">Complete the transaction</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">📋 Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order:</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            {order.table && (
              <div className="flex justify-between">
                <span className="text-gray-600">Table:</span>
                <span className="font-semibold">Table {order.table.number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="font-semibold">{formatCurrency(order.tax_amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tip:</span>
              <span className="font-semibold">{formatCurrency(tip)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 text-lg">
              <span>Total:</span>
              <span className="text-green-600">{formatCurrency(total + tip)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePayment} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">💳 Payment Method</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setPaymentMethod('cash'); setReference(''); }}
                className={`p-4 border-2 rounded-xl flex flex-col items-center transition-all transform hover:scale-105 ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-8 h-8 mb-2" />
                <span className="text-sm font-bold">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 border-2 rounded-xl flex flex-col items-center transition-all transform hover:scale-105 ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-8 h-8 mb-2" />
                <span className="text-sm font-bold">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile')}
                className={`p-4 border-2 rounded-xl flex flex-col items-center transition-all transform hover:scale-105 ${
                  paymentMethod === 'mobile'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className="w-8 h-8 mb-2" />
                <span className="text-sm font-bold">Mobile</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">💸 Tip Amount</label>
            <input
              type="number"
              value={tip}
              onChange={(e) => setTip(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
              placeholder="Enter tip amount"
              min="0"
              step="0.01"
            />
          </div>

          {(paymentMethod === 'card' || paymentMethod === 'mobile') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">🔢 Payment Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value.trimStart())}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                placeholder="Enter transaction ID (e.g., TXN12345)"
                required
              />
            </div>
          )}

          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-green-800 text-lg">💰 Total to Charge:</span>
              <span className="text-2xl font-bold text-green-800">
                {formatCurrency(total + tip)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Receipt className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Processing...' : 'Process Payment 🎉'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
