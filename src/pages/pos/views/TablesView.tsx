import React from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Users, Clock, CheckCircle, AlertCircle, Settings, QrCode } from 'lucide-react';

const statusConfig = {
  available: {
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: CheckCircle
  },
  occupied: {
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: AlertCircle
  },
  reserved: {
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    icon: Clock
  },
  cleaning: {
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    icon: Settings
  },
  maintenance: {
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    icon: Settings
  }
};

export function TablesView() {
  const { tables, selectedTable, selectTable, orders } = usePOSStore();

  const getTableOrder = (tableId: string) => {
    return orders.find(order => order.table_id === tableId && order.status !== 'paid');
  };

  const tablesByStatus = tables.reduce((acc, table) => {
    if (!acc[table.status]) acc[table.status] = [];
    acc[table.status].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            <p className="text-gray-600 mt-1">Select a table for dine-in orders</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {tables.filter(t => t.status === 'available').length}
              </div>
              <div className="text-sm text-gray-500">Available Tables</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = tablesByStatus[status]?.length || 0;
            return (
              <div key={status} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.color}`}></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {status} ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {tables.map(table => {
            const config = statusConfig[table.status];
            const Icon = config.icon;
            const isSelected = selectedTable?.id === table.id;
            const tableOrder = getTableOrder(table.id);
            const canSelect = table.status === 'available' || isSelected;
            
            return (
              <button
                key={table.id}
                onClick={() => canSelect ? selectTable(isSelected ? null : table) : null}
                disabled={!canSelect}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 text-center
                  ${isSelected 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 ring-4 ring-purple-200 shadow-xl' 
                    : `${config.bgColor} ${config.borderColor}`
                  }
                  ${canSelect 
                    ? 'hover:shadow-lg cursor-pointer' 
                    : 'cursor-not-allowed opacity-75'
                  }
                `}
              >
                {/* Status Indicator */}
                <div className="absolute top-3 right-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.color} ${
                    table.status === 'occupied' ? 'animate-pulse' : ''
                  }`}></div>
                </div>

                {/* QR Code Icon for available tables */}
                {table.status === 'available' && (
                  <div className="absolute top-3 left-3">
                    <QrCode className="w-4 h-4 text-gray-400" />
                  </div>
                )}

                {/* Table Icon */}
                <div className={`flex items-center justify-center mb-4 ${
                  isSelected ? 'text-purple-600' : config.textColor
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                
                {/* Table Info */}
                <div className="space-y-2">
                  <h3 className={`text-xl font-bold ${
                    isSelected ? 'text-purple-900' : 'text-gray-900'
                  }`}>
                    Table {table.number}
                  </h3>
                  
                  {table.name && (
                    <p className={`text-sm ${
                      isSelected ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {table.name}
                    </p>
                  )}
                  
                  <div className={`flex items-center justify-center text-sm ${
                    isSelected ? 'text-purple-600' : config.textColor
                  }`}>
                    <Users className="w-4 h-4 mr-1" />
                    {table.capacity} seats
                  </div>
                  
                  <p className={`text-xs font-medium capitalize ${
                    isSelected ? 'text-purple-600' : config.textColor
                  }`}>
                    {table.status.replace('_', ' ')}
                  </p>

                  {/* Order Info for occupied tables */}
                  {tableOrder && (
                    <div className="mt-3 p-2 bg-white/50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-800">
                        {tableOrder.order_number}
                      </p>
                      <p className="text-xs text-gray-600">
                        ${tableOrder.total_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Selected
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Table Info */}
        {selectedTable && (
          <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Selected Table</h3>
              <button
                onClick={() => selectTable(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Table Number</p>
                <p className="font-semibold text-gray-900">{selectedTable.number}</p>
              </div>
              {selectedTable.name && (
                <div>
                  <p className="text-sm text-gray-500">Table Name</p>
                  <p className="font-semibold text-gray-900">{selectedTable.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Capacity</p>
                <p className="font-semibold text-gray-900">{selectedTable.capacity} guests</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`font-semibold capitalize ${statusConfig[selectedTable.status].textColor}`}>
                  {selectedTable.status.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">No tables configured</p>
            <p className="text-gray-400">Contact your administrator to set up tables</p>
          </div>
        )}
      </div>
    </div>
  );
}