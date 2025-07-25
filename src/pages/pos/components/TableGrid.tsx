import React from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const statusColors = {
  available: 'bg-green-100 border-green-300 text-green-800',
  occupied: 'bg-red-100 border-red-300 text-red-800',
  reserved: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  cleaning: 'bg-gray-100 border-gray-300 text-gray-800'
};

const statusIcons = {
  available: CheckCircle,
  occupied: AlertCircle,
  reserved: Clock,
  cleaning: Users
};

export function TableGrid() {
  const { tables, selectedTable, selectTable } = usePOSStore();

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Table Management</h2>
        <p className="text-gray-600">Select a table for dine-in orders</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map(table => {
          const StatusIcon = statusIcons[table.status];
          const isSelected = selectedTable?.id === table.id;
          
          return (
            <button
              key={table.id}
              onClick={() => selectTable(table.status === 'available' || isSelected ? table : null)}
              disabled={table.status === 'occupied' && !isSelected}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 text-center
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : statusColors[table.status]
                }
                ${table.status === 'available' || isSelected 
                  ? 'hover:shadow-lg cursor-pointer' 
                  : 'cursor-not-allowed opacity-75'
                }
              `}
            >
              <div className="flex items-center justify-center mb-2">
                <StatusIcon className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-semibold">
                  Table {table.number}
                </h3>
                {table.name && (
                  <p className="text-sm opacity-75">
                    {table.name}
                  </p>
                )}
                <div className="flex items-center justify-center text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {table.capacity} seats
                </div>
                <p className="text-xs font-medium capitalize">
                  {table.status}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTable && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">Selected Table</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Table:</strong> {selectedTable.number}</p>
            {selectedTable.name && <p><strong>Name:</strong> {selectedTable.name}</p>}
            <p><strong>Capacity:</strong> {selectedTable.capacity} guests</p>
            <p><strong>Status:</strong> <span className="capitalize">{selectedTable.status}</span></p>
          </div>
        </div>
      )}

      {tables.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tables configured</p>
        </div>
      )}
    </div>
  );
}