'use client';

import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { ErrorBoundary } from '@/shared/components/error';
import { AlertTriangle, Users, Hash, QrCode } from 'lucide-react';
import type { Table } from '../types';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (table: Table) => void;
  existingTables: Table[];
  createTable: (payload: { number: number; capacity: number }) => Promise<Table>;
}

interface TableFormData {
  number: string;
  capacity: string;
}

interface FormErrors {
  number?: string;
  capacity?: string;
  submit?: string;
}

export function AddTableModal({ isOpen, onClose, onSuccess, existingTables, createTable }: AddTableModalProps) {
  const [formData, setFormData] = useState<TableFormData>({
    number: '',
    capacity: '4'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ number: '', capacity: '4' });
    setErrors({});
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate table number
    const tableNumber = parseInt(formData.number);
    if (!formData.number.trim()) {
      newErrors.number = 'Table number is required';
    } else if (isNaN(tableNumber)) {
      newErrors.number = 'Table number must be a valid number';
    } else if (tableNumber < 1 || tableNumber > 999) {
      newErrors.number = 'Table number must be between 1 and 999';
    } else if (!Number.isInteger(tableNumber)) {
      newErrors.number = 'Table number must be a whole number';
    } else {
      // Check if table number already exists
      const existingTable = existingTables.find(table => table.number === tableNumber);
      if (existingTable) {
        newErrors.number = `Table ${tableNumber} already exists`;
      }
    }

    // Validate capacity
    const capacity = parseInt(formData.capacity);
    if (!formData.capacity.trim()) {
      newErrors.capacity = 'Capacity is required';
    } else if (isNaN(capacity)) {
      newErrors.capacity = 'Capacity must be a valid number';
    } else if (capacity < 1 || capacity > 20) {
      newErrors.capacity = 'Capacity must be between 1 and 20 seats';
    } else if (!Number.isInteger(capacity)) {
      newErrors.capacity = 'Capacity must be a whole number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const newTable = await createTable({
        number: parseInt(formData.number),
        capacity: parseInt(formData.capacity)
      });

      onSuccess(newTable);
      handleClose();
    } catch (error) {
      console.error('Error creating table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create table';
      
      // Check for specific error types
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setErrors({ number: `Table ${formData.number} already exists` });
      } else if (errorMessage.includes('restaurant')) {
        setErrors({ submit: 'Please select a restaurant first' });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TableFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getQRCodePreview = () => {
    const tableNumber = parseInt(formData.number);
    if (isNaN(tableNumber)) return null;
    
    return (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2 text-blue-700">
          <QrCode className="w-4 h-4" />
          <span className="text-sm font-medium">QR Code will be generated</span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Customers will scan this code to access Table {tableNumber}
        </p>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Table"
    >
      <ErrorBoundary level="component" name="AddTableModal">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table Number Field */}
          <div>
            <Label htmlFor="tableNumber" className="flex items-center space-x-2">
              <Hash className="w-4 h-4" />
              <span>Table Number</span>
            </Label>
            <Input
              id="tableNumber"
              type="number"
              min="1"
              max="999"
              value={formData.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
              placeholder="Enter table number (1-999)"
              className={`mt-1 ${errors.number ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            {errors.number && (
              <div className="mt-1 flex items-center space-x-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{errors.number}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Choose a unique number for this table (1-999)
            </p>
          </div>

          {/* Capacity Field */}
          <div>
            <Label htmlFor="capacity" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Seating Capacity</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
              placeholder="Number of seats"
              className={`mt-1 ${errors.capacity ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            {errors.capacity && (
              <div className="mt-1 flex items-center space-x-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{errors.capacity}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of customers that can sit at this table (1-20)
            </p>
          </div>

          {/* QR Code Preview */}
          {formData.number && !errors.number && getQRCodePreview()}

          {/* General Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{errors.submit}</p>
            </div>
          )}

          {/* Table Summary */}
          {formData.number && formData.capacity && !errors.number && !errors.capacity && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-2">Table Summary</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p>• Table Number: <strong>{formData.number}</strong></p>
                <p>• Seating Capacity: <strong>{formData.capacity} {parseInt(formData.capacity) === 1 ? 'person' : 'people'}</strong></p>
                <p>• QR Code: Will be automatically generated</p>
                <p>• Status: Available (default)</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Table'
              )}
            </Button>
          </div>
        </form>
      </ErrorBoundary>
    </Modal>
  );
}