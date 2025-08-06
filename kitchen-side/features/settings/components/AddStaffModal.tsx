/**
 * Add Staff Modal Component
 * Modal for adding new staff members
 */

"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import { CreateStaffData } from '../hooks/useStaff';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffData) => Promise<void>;
  restaurantId: string;
}

const ROLES = ['WAITER', 'CHEF', 'CASHIER', 'MANAGER', 'ADMIN'] as const;

export function AddStaffModal({ isOpen, onClose, onSubmit, restaurantId }: AddStaffModalProps) {
  const t = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<CreateStaffData>({
    name: '',
    email: '',
    password: '',
    role: 'WAITER',
    restaurantId: restaurantId,
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'WAITER',
        restaurantId: restaurantId,
      });
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding staff:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CreateStaffData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange('password', password);
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
          <h3 className="text-2xl font-bold text-white">{t.settings.staff.addNewStaff}</h3>
          <p className="text-blue-100 mt-1">Create a new staff account for your restaurant</p>
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
              <p className="text-xs text-gray-500 mt-1">
                Staff will use this email to login
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Password <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter initial password"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Staff member can change this after first login
              </p>
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

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 text-sm">ℹ️</span>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Invitation Email</p>
                  <p>An invitation email will be sent to the staff member with login instructions and their temporary password.</p>
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
              {isLoading ? 'Creating...' : t.settings.staff.inviteStaff}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}