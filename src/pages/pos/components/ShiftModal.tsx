import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Shift } from '../types/pos';

interface ShiftModalProps {
  onClose: () => void;
}

export function ShiftModal({ onClose }: ShiftModalProps) {
  const { currentUser, currentShift, startShift, endShift } = usePOSStore();
  const [startingCash, setStartingCash] = useState('100.00');
  const [endingCash, setEndingCash] = useState('0.00');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: any): string => {
    if (value == null) return '0.00';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }
    const amount = parseFloat(startingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid starting cash amount');
      return;
    }

    setLoading(true);
    try {
      const timeout = setTimeout(() => {
        setLoading(false);
        toast.error('Operation timed out. Please try again.');
      }, 10000);
      await startShift(amount);
      clearTimeout(timeout);
      toast.success('Shift started successfully! 🎉');
      onClose();
    } catch (error) {
      toast.error(`Failed to start shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }
    const amount = parseFloat(endingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid ending cash amount');
      return;
    }

    setLoading(true);
    try {
      const timeout = setTimeout(() => {
        setLoading(false);
        toast.error('Operation timed out. Please try again.');
      }, 10000);
      const shift: Shift = await endShift(amount);
      clearTimeout(timeout);
      toast.success(`Shift ended! Total sales: $${formatCurrency(shift.total_sales)}`);
      onClose();
    } catch (error) {
      toast.error(`Failed to end shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = ['50.00', '100.00', '200.00', '500.00'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl mr-4">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentShift ? 'End Shift' : 'Start Shift'}
            </h2>
            <p className="text-gray-600">
              {currentShift ? 'Complete your shift and cash out' : 'Begin your shift with starting cash'}
            </p>
          </div>
        </div>

        {!currentShift ? (
          <form onSubmit={handleStartShift} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <DollarSign className="inline w-4 h-4 mr-2" />
                Starting Cash Amount
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setStartingCash(amount)}
                    className={`p-3 rounded-xl font-semibold transition-all ${
                      startingCash === amount
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
                placeholder="0.00"
                required
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Shift Start Tips:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Count your cash drawer carefully</li>
                <li>• Verify all bills and coins</li>
                <li>• Keep your receipt for records</li>
              </ul>
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
                className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105"
              >
                {loading ? 'Starting...' : 'Start Shift 🚀'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEndShift} className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Shift Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Started:</p>
                  <p className="font-semibold">{new Date(currentShift.start_time).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Starting Cash:</p>
                  <p className="font-semibold">${formatCurrency(currentShift.starting_cash)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Sales:</p>
                  <p className="font-semibold text-green-600">${formatCurrency(currentShift.total_sales)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Tips:</p>
                  <p className="font-semibold text-blue-600">${formatCurrency(currentShift.total_tips)}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <DollarSign className="inline w-4 h-4 mr-2" />
                Ending Cash Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold text-center"
                placeholder="0.00"
                required
              />
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2">⚠️ Before Ending Shift:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Count all cash in drawer</li>
                <li>• Complete all pending orders</li>
                <li>• Clean your work area</li>
                <li>• Hand over to next shift</li>
              </ul>
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
                className="flex-1 px-4 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105"
              >
                {loading ? 'Ending...' : 'End Shift 🏁'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}