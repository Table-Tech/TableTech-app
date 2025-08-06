"use client";

import React, { useState } from 'react';
import { RoleGuard } from '@/shared/components/protection';
import { useTranslation, useLanguage } from '@/shared/contexts/LanguageContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { TimePicker } from '@/shared/components/ui/TimePicker';
import { useStaff, StaffMember } from '../hooks/useStaff';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';

type SettingsTab = 'general' | 'payment' | 'staff';

const SettingsPage = React.memo(() => {
  const t = useTranslation();
  const { selectedRestaurant } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general', label: t.settings.tabs.general },
    { id: 'payment', label: t.settings.tabs.payment },
    { id: 'staff', label: t.settings.tabs.staff },
  ] as const;

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        {/* Header Section */}
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="bg-gradient-to-br from-white/70 via-purple-50/60 to-indigo-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                {t.settings.title}
              </h1>
              <p className="text-gray-600 text-sm">Configure your restaurant settings and preferences</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Tab Navigation */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm mb-8">
            <nav className="flex space-x-1 p-2" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
            <div className="p-8">
              {activeTab === 'general' && (
                <GeneralSettings restaurant={selectedRestaurant} />
              )}
              {activeTab === 'payment' && (
                <PaymentSettings restaurant={selectedRestaurant} />
              )}
              {activeTab === 'staff' && (
                <StaffManagement restaurant={selectedRestaurant} />
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
});

// General Settings Component
const GeneralSettings = ({ restaurant }: { restaurant: any }) => {
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">{t.settings.general.title}</h2>
        <p className="text-gray-600 mb-6">{t.settings.general.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Language Settings */}
        <div className="border-b pb-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">{t.settings.general.languageSettings}</h3>
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.general.language}
            </label>
            <div className="relative inline-flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  language === 'en'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('nl')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  language === 'nl'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                NL
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Information */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.general.restaurantInfo}</h3>
            <p className="text-sm text-gray-600">Basic restaurant information (managed by system administrator)</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 space-y-6">
            {/* Restaurant Name */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">🏪</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t.settings.general.restaurantName}
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {restaurant?.name || 'TableTech Restaurant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant Address */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-lg">📍</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t.settings.general.address}
                </h4>
                <p className="text-base text-gray-900 leading-relaxed">
                  {restaurant?.address || '123 Restaurant Street, Food District, City 12345'}
                </p>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-lg">📞</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t.settings.general.phone}
                </h4>
                <p className="text-base text-gray-900 font-mono">
                  {restaurant?.phone || '+1 (555) 123-4567'}
                </p>
              </div>
            </div>

            {/* Info Note */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 text-sm">ℹ️</span>
                <p className="text-sm text-blue-700">
                  {t.settings.general.contactAdminNote}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.general.openingHours}</h3>
            <p className="text-sm text-gray-600">Set your restaurant's operating hours for each day of the week</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, index) => (
              <OpeningHoursDay
                key={day}
                day={day}
                dayLabel={t.settings.general.days[day as keyof typeof t.settings.general.days]}
                closedLabel={t.settings.general.closed}
                isWeekend={day === 'saturday' || day === 'sunday'}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="px-6 py-3 border border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-50 hover:border-red-400 transition-all duration-200"
        >
          {t.nav.logout}
        </button>
        <div className="flex space-x-3">
          <button className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200">
            {t.common.cancel}
          </button>
          <button
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {saving ? t.settings.general.saving : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Option Component
interface PaymentOptionProps {
  icon: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
  iconBg: string;
  iconColor: string;
}

const PaymentOption = ({ 
  icon, 
  title, 
  description, 
  defaultChecked = false,
  iconBg,
  iconColor 
}: PaymentOptionProps) => {
  const [isEnabled, setIsEnabled] = useState(defaultChecked);

  return (
    <div className={`
      bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200
      ${isEnabled ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-gray-300'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900">
              {title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="sr-only"
          />
          <div className={`
            relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200
            ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}
          `}>
            <span className={`
              inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
              ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
            `} />
          </div>
        </label>
      </div>
    </div>
  );
};

// Payment Settings Component
const PaymentSettings = ({ restaurant }: { restaurant: any }) => {
  const t = useTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">{t.settings.payment.title}</h2>
        <p className="text-gray-600 mb-6">{t.settings.payment.description}</p>
      </div>

      {/* Payment Options */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.payment.options}</h3>
          <p className="text-sm text-gray-600">Configure which payment methods your restaurant accepts</p>
        </div>
        
        <div className="space-y-4">
          <PaymentOption
            icon="💵"
            title={t.settings.payment.acceptCash}
            description="Accept cash payments at the restaurant"
            defaultChecked={true}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <PaymentOption
            icon="💳"
            title={t.settings.payment.acceptCard}
            description="Accept credit and debit card payments"
            defaultChecked={true}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <PaymentOption
            icon="🌐"
            title={t.settings.payment.acceptOnline}
            description="Accept online payments through the ordering system"
            defaultChecked={true}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-8 border-t border-gray-200">
        <button className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200">
          {t.common.cancel}
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
          {t.common.save}
        </button>
      </div>
    </div>
  );
};

// Staff Management Component
const StaffManagement = ({ restaurant }: { restaurant: any }) => {
  const t = useTranslation();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { 
    staff, 
    isLoading, 
    error, 
    createStaff, 
    updateStaff, 
    deleteStaff, 
    toggleStaffStatus 
  } = useStaff();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t.settings.staff.title}</h2>
          <p className="text-gray-600 mt-1">{t.settings.staff.description}</p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          {t.settings.staff.addStaff}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading staff...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Staff List */}
      {!isLoading && !error && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-gray-600 mb-4">No staff members found</p>
              <p className="text-sm text-gray-500">Add your first staff member to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t.settings.staff.name}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t.settings.staff.email}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t.settings.staff.role}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t.settings.staff.status}
                    </th>
                    <th className="relative px-6 py-4">
                      <span className="sr-only">{t.common.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {t.settings.staff.roles[member.role as keyof typeof t.settings.staff.roles]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.isActive}
                            onChange={() => toggleStaffStatus(member.id, !member.isActive)}
                            className="sr-only"
                          />
                          <div className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                            ${member.isActive ? 'bg-green-500' : 'bg-gray-300'}
                          `}>
                            <span className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                              ${member.isActive ? 'translate-x-6' : 'translate-x-1'}
                            `} />
                          </div>
                          <span className={`ml-2 text-xs font-medium ${
                            member.isActive ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {member.isActive ? t.settings.staff.active : t.settings.staff.inactive}
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingStaff(member)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-200"
                          >
                            {t.common.edit}
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-200"
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        onSubmit={createStaff}
        restaurantId={restaurant?.id || ''}
      />

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={editingStaff !== null}
        onClose={() => setEditingStaff(null)}
        onSubmit={updateStaff}
        staff={editingStaff}
      />
    </div>
  );
};

// Opening Hours Day Component
interface OpeningHoursDayProps {
  day: string;
  dayLabel: string;
  closedLabel: string;
  isWeekend?: boolean;
}

const OpeningHoursDay = ({ day, dayLabel, closedLabel, isWeekend = false }: OpeningHoursDayProps) => {
  const [isClosed, setIsClosed] = useState(false);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('22:00');

  return (
    <div className={`
      bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200
      ${isWeekend ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-blue-400'}
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`
            w-3 h-3 rounded-full
            ${isWeekend ? 'bg-amber-400' : 'bg-blue-400'}
          `}></div>
          <h4 className="text-base font-semibold text-gray-900 capitalize">
            {dayLabel}
          </h4>
        </div>
        
        {/* Closed Toggle */}
        <label className="flex items-center space-x-3 cursor-pointer group">
          <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
            {closedLabel}
          </span>
          <input
            type="checkbox"
            checked={isClosed}
            onChange={(e) => setIsClosed(e.target.checked)}
            className="sr-only"
          />
          <div className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
            ${isClosed ? 'bg-red-500' : 'bg-gray-300'}
          `}>
            <span className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
              ${isClosed ? 'translate-x-6' : 'translate-x-1'}
            `} />
          </div>
        </label>
      </div>

      {!isClosed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Opening Time
            </label>
            <TimePicker
              value={openTime}
              onChange={setOpenTime}
              placeholder="09:00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Closing Time
            </label>
            <TimePicker
              value={closeTime}
              onChange={setCloseTime}
              placeholder="22:00"
            />
          </div>
        </div>
      )}

      {isClosed && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-red-500 text-xl">🚫</span>
          </div>
          <p className="text-sm text-red-600 font-medium">Restaurant is closed on {dayLabel}</p>
        </div>
      )}
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;