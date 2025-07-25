import React from 'react';

export function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <div className="mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">System Settings</h2>
          </div>
          {/* Add settings form here */}
        </div>
      </div>
    </div>
  );
}