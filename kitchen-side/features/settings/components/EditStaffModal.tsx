/**
 * Edit Staff Modal Component
 * Modal for editing existing staff members
 */

"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import { StaffMember, UpdateStaffData } from '../hooks/useStaff';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateStaffData) => Promise<void>;
  staff: StaffMember | null;
}

const ROLES = ['WAITER', 'CHEF', 'CASHIER', 'MANAGER', 'ADMIN'] as const;

export function EditStaffModal({ isOpen, onClose, onSubmit, staff }: EditStaffModalProps) {
  const t = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<UpdateStaffData>({
    name: '',
    email: '',
    role: 'WAITER',
    isActive: true,
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
      });
    }
  }, [staff]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !staff || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit(staff.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof UpdateStaffData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h3 className="text-2xl font-bold text-white">Edit Staff Member</h3>
          <p className="text-blue-100 mt-1">Update staff member information and permissions</p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.settings.staff.name} <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter staff member's full name"
                required
                className="w-full"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.settings.staff.email} <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="staff@restaurant.com"
                required
                className="w-full"
              />
            </div>

            {/* Role Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.settings.staff.role} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t.settings.staff.roles[role as keyof typeof t.settings.staff.roles]}
                  </option>
                ))}
              </select>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 font-medium">Role Permissions:</p>
                {formData.role === 'WAITER' && (
                  <p className="text-xs text-gray-500">• View orders • Update order status • View menu</p>
                )}
                {formData.role === 'CHEF' && (
                  <p className="text-xs text-gray-500">• View kitchen orders • Update order status • Manage menu availability</p>
                )}
                {formData.role === 'CASHIER' && (
                  <p className="text-xs text-gray-500">• Process payments • View orders • Generate receipts</p>
                )}
                {formData.role === 'MANAGER' && (
                  <p className="text-xs text-gray-500">• All staff permissions • Manage menu • View reports • Manage staff</p>
                )}
                {formData.role === 'ADMIN' && (
                  <p className="text-xs text-gray-500">• Full restaurant access • All permissions • System settings</p>
                )}
              </div>
            </div>

            {/* Status Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.isActive === true}
                    onChange={() => handleChange('isActive', true)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-2 ${formData.isActive ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                    {formData.isActive && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className={`text-sm ${formData.isActive ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {t.settings.staff.active}
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.isActive === false}
                    onChange={() => handleChange('isActive', false)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-2 ${!formData.isActive ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                    {!formData.isActive && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className={`text-sm ${!formData.isActive ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                    {t.settings.staff.inactive}
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.isActive 
                  ? 'Staff member can access the system'
                  : 'Staff member cannot log in to the system'
                }
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-amber-500 text-sm">⚠️</span>
                <div className="text-sm text-amber-700">
                  <p className="font-medium mb-1">Important</p>
                  <p>Changes to role permissions take effect immediately. The staff member may need to log out and back in to see updated permissions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? 'Saving...' : t.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}