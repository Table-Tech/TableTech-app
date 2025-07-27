"use client";

import React from 'react';
import { RoleGuard } from '@/shared/components/protection';

const SettingsPage = React.memo(() => {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Settings</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <p className="text-gray-600">Restaurant management settings will be implemented here.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Payment Settings</h2>
          <p className="text-gray-600">Payment configuration options will be available here.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Staff Management</h2>
          <p className="text-gray-600">Staff roles and permissions management will be here.</p>
        </div>
      </div>
    </RoleGuard>
  );
});

SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;