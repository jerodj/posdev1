import React from 'react';
import { usePOSStore } from '../../../store/posStore';
import { LogOut, Clock, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';

interface POSHeaderProps {
  onStartShift: () => void;
}

export function POSHeader({ onStartShift }: POSHeaderProps) {
  const { currentUser, currentShift, logout } = usePOSStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Restaurant POS</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(), 'EEEE, MMMM d, yyyy • HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Shift Status */}
          {currentShift ? (
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 rounded-lg">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Shift Active
              </span>
            </div>
          ) : (
            <button
              onClick={onStartShift}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Start Shift
              </span>
            </button>
          )}

          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {currentUser?.full_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {currentUser?.role} • ID: {currentUser?.staff_id}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}