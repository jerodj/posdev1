import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { ShoppingCart, Plus, Minus, Trash2, Send, User, MapPin, Percent, DollarSign, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export function OrderPanel() {
  const {
    cart,
    selectedTable,
    currentUser,
    discountType,
    discountValue,
    updateCartItem,
    removeFromCart,
    clearCart,
    setDiscount,
    createOrder,
  } = usePOSStore();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'bar'>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [tempDiscountValue, setTempDiscountValue] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : parseFloat(discountValue);
  }
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * 0.1;
  const total = discountedSubtotal + taxAmount;

  const handleCreateOrder = async (sendToKitchenFlag = false) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'dine_in' && !selectedTable) {
      toast.error('Please select a table');
      return;
    }
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder(orderType, customerName, sendToKitchenFlag);
      toast.success(`Order ${order.order_number} ${sendToKitchenFlag ? 'sent to kitchen' : 'created'}`);
      clearCart();
      setCustomerName('');
    } catch (error) {
      toast.error(`Failed to ${sendToKitchenFlag ? 'send order to kitchen' : 'create order'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(tempDiscountValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid discount value');
      return;
    }
    if (tempDiscountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    setDiscount(tempDiscountType, value);
    setShowDiscountModal(false);
    toast.success(`${tempDiscountType === 'percentage' ? value + '%' : '$' + value} discount applied`);
  };

  const handleRemoveDiscount = () => {
    setDiscount(null, 0);
    toast.success('Discount removed');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <ShoppingCart className="w-6 h-6 mr-3" />
          Current Order
        </h2>
        <p className="text-purple-100 mt-1">{cart.length} items in cart</p>
      </div>
      <div className="p-4 bg-white border-b border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'dine_in', label: 'Dine In' },
            { value: 'takeaway', label: 'Takeaway' },
            { value: 'delivery', label: 'Delivery' },
            { value: 'bar', label: 'Bar' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setOrderType(type.value as any)}
              className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                orderType === type.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      {orderType === 'dine_in' && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <MapPin className="w-4 h-4 mr-2" />
            Selected Table
          </div>
          {selectedTable ? (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <p className="font-bold text-blue-900">Table {selectedTable.number}</p>
              <p className="text-sm text-blue-600">Capacity: {selectedTable.capacity} guests</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              Please select a table from the Tables tab
            </p>
          )}
        </div>
      )}
      {(orderType === 'takeaway' || orderType === 'delivery') && (
        <div className="p-4 bg-white border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <User className="inline w-4 h-4 mr-2" />
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter customer name"
          />
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="text-sm">Add items from the menu</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{item.menu_item.name}</h3>
                    <p className="text-sm text-gray-600">${parseFloat(item.unit_price).toFixed(2)} each</p>
                    {item.modifiers?.length > 0 && (
                      <div className="text-xs text-purple-600 mt-1 p-2 bg-purple-50 rounded-lg">
                        <strong>Modifiers:</strong> {item.modifiers.map(mod => mod.name).join(', ')}
                      </div>
                    )}
                    {item.special_instructions && (
                      <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded-lg">
                        <strong>Note:</strong> {item.special_instructions}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateCartItem(item.id, item.quantity - 1)}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.id, item.quantity + 1)}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-bold text-lg text-gray-900">${parseFloat(item.total_price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="mb-4">
            {discountType ? (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    {discountType === 'percentage' ? `${discountValue}% Off` : `$${discountValue} Off`}
                  </span>
                </div>
                <button
                  onClick={handleRemoveDiscount}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscountModal(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center"
              >
                <Tag className="w-4 h-4 mr-2" />
                Add Discount
              </button>
            )}
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Tax (10%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => handleCreateOrder(true)}
              disabled={loading}
              className="w-full py-4 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold text-lg transition-all flex items-center justify-center transform hover:scale-105"
            >
              <Send className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 'Send to Kitchen'}
            </button>
            <button
              onClick={() => handleCreateOrder(false)}
              disabled={loading}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105"
            >
              {loading ? 'Processing...' : 'Create Order Only'}
            </button>
            <button
              onClick={clearCart}
              className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Tag className="w-6 h-6 mr-2 text-purple-600" />
              Add Discount
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTempDiscountType('percentage')}
                    className={`p-3 rounded-xl font-semibold transition-all flex items-center justify-center ${
                      tempDiscountType === 'percentage' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Percent className="w-4 h-4 mr-1" />
                    Percentage
                  </button>
                  <button
                    onClick={() => setTempDiscountType('amount')}
                    className={`p-3 rounded-xl font-semibold transition-all flex items-center justify-center ${
                      tempDiscountType === 'amount' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Amount
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {tempDiscountType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={tempDiscountType === 'percentage' ? '100' : undefined}
                  value={tempDiscountValue}
                  onChange={e => setTempDiscountValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={tempDiscountType === 'percentage' ? '10' : '5.00'}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}