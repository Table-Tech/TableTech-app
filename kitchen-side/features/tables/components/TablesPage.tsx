"use client";

import React, { useState, useMemo } from 'react';
import { useTables } from '../hooks/useTables';
import { Button, Input, Select, LoadingSpinner, EmptyState } from '@/shared/components/ui';
import { Wifi, WifiOff, RefreshCw, Plus, QrCode, Download, Eye } from 'lucide-react';
import { ErrorBoundary } from '@/shared/components/error';
import { AddTableModal } from './AddTableModal';
import { Modal } from '@/shared/components/ui/Modal';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import type { TableFilters, Table } from '../types';

const TablesPage = React.memo(() => {
  const t = useTranslation();
  const [filters, setFilters] = useState<TableFilters>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);
  const { tables, loading, error, connectionStatus, refetch, createTable, updateTable, deleteTable } = useTables(filters);

  const tableStats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
    outOfOrder: tables.filter(t => t.status === 'OUT_OF_ORDER').length,
  }), [tables]);

  // Helper function to get translated status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return t.tables.available;
      case 'OCCUPIED': return t.tables.occupied;
      case 'RESERVED': return t.tables.reserved;
      case 'OUT_OF_ORDER': return t.tables.outOfOrder;
      default: return status.replace('_', ' ');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">{t.common.error}: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tables.title}</h1>
          <p className="text-gray-600 mt-1">{t.tables.manageTablesDescription}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">{t.tables.live}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">{t.tables.offline}</span>
              </>
            )}
          </div>
          <Button 
            onClick={refetch}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t.tables.refresh}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t.tables.addTable}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">{t.tables.total}</p>
          <p className="text-2xl font-bold">{tableStats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">{t.tables.available}</p>
          <p className="text-2xl font-bold text-green-700">{tableStats.available}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">{t.tables.occupied}</p>
          <p className="text-2xl font-bold text-red-700">{tableStats.occupied}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">{t.tables.reserved}</p>
          <p className="text-2xl font-bold text-yellow-700">{tableStats.reserved}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">{t.tables.outOfOrder}</p>
          <p className="text-2xl font-bold text-gray-700">{tableStats.outOfOrder}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder={t.tables.searchTables}
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="max-w-xs"
        />
        <Select
          value={filters.status || ''}
          onChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_ORDER' | undefined || undefined 
          }))}
          placeholder={t.tables.allStatuses}
          options={[
            { label: t.tables.allStatuses, value: '' },
            { label: t.tables.available, value: 'AVAILABLE' },
            { label: t.tables.occupied, value: 'OCCUPIED' },
            { label: t.tables.reserved, value: 'RESERVED' },
            { label: t.tables.outOfOrder, value: 'OUT_OF_ORDER' },
          ]}
        />
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <EmptyState 
          title={t.tables.noTablesFound}
          description={t.tables.createFirstTable}
        />
      ) : (
        <ErrorBoundary 
          level="section" 
          name="TablesGrid"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <ErrorBoundary 
                key={table.id}
                level="component" 
                name={`TableCard-${table.number}`}
              >
                <div
                  className={`p-4 border rounded-lg ${
                    table.status === 'AVAILABLE' ? 'border-green-200 bg-green-50' :
                    table.status === 'OCCUPIED' ? 'border-red-200 bg-red-50' :
                    table.status === 'RESERVED' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">{t.tables.table} {table.number}</h3>
                    <p className="text-sm text-gray-600">{table.capacity} {t.tables.seats}</p>
                    
                    {/* Table Code */}
                    {table.code && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {t.tables.code}: {table.code}
                      </p>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`mt-2 px-2 py-1 text-xs rounded-full inline-block ${
                      table.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                      table.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                      table.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(table.status)}
                    </div>

                    {/* QR Code Button */}
                    {table.qrCodeUrl && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTableForQR(table)}
                          className="w-full flex items-center justify-center"
                        >
                          <QrCode className="w-3 h-3 mr-1" />
                          {t.tables.viewQr}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ErrorBoundary>
            ))}
          </div>
        </ErrorBoundary>
      )}

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newTable: Table) => {
          // The table will be automatically added to the list by the useTables hook
          // We just need to close the modal and optionally show a success message
          setIsAddModalOpen(false);
          refetch(); // Refresh the table list to ensure consistency
        }}
        existingTables={tables}
        createTable={createTable}
      />

      {/* QR Code Modal */}
      <Modal
        isOpen={!!selectedTableForQR}
        onClose={() => setSelectedTableForQR(null)}
        title={`${t.tables.qrCodeFor} ${selectedTableForQR?.number}`}
      >
        {selectedTableForQR && (
          <ErrorBoundary level="component" name="QRCodeModal">
            <div className="space-y-6">
              {/* Table Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      {t.tables.table} {selectedTableForQR.number}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {selectedTableForQR.capacity} {t.tables.seats} • {t.tables.code}: {selectedTableForQR.code}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    selectedTableForQR.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    selectedTableForQR.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                    selectedTableForQR.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusText(selectedTableForQR.status)}
                  </div>
                </div>
              </div>

              {/* QR Code Image */}
              {selectedTableForQR.qrCodeUrl ? (
                <div className="text-center">
                  <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                    <img
                      src={selectedTableForQR.qrCodeUrl}
                      alt={`${t.tables.qrCode} ${t.tables.table} ${selectedTableForQR.number}`}
                      className="w-64 h-64 mx-auto"
                      onError={(e) => {
                        console.error('QR code image failed to load:', selectedTableForQR.qrCodeUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* QR Code Actions */}
                  <div className="flex justify-center space-x-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedTableForQR.qrCodeUrl) {
                          window.open(selectedTableForQR.qrCodeUrl, '_blank');
                        }
                      }}
                      className="flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t.tables.viewFullSize}
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        if (selectedTableForQR.qrCodeUrl) {
                          try {
                            // Generate QR URL without background for transparent PNG
                            const tableUrl = `${window.location.origin.replace(':3002', ':3000')}/table/${selectedTableForQR.code}`;
                            const qrUrlNoBackground = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}&color=000000&margin=10&format=png`;
                            
                            // Fetch the QR code as blob to avoid redirect
                            const response = await fetch(qrUrlNoBackground);
                            const blob = await response.blob();
                            
                            // Create download link
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `table-${selectedTableForQR.number}-qr-code.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Clean up
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Failed to download QR code:', error);
                            // Fallback to original method
                            const link = document.createElement('a');
                            link.href = selectedTableForQR.qrCodeUrl;
                            link.download = `table-${selectedTableForQR.number}-qr-code.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }
                      }}
                      className="flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t.tables.downloadQr}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t.tables.qrCodeNotAvailable}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.tables.qrCodesGenerated}
                  </p>
                </div>
              )}

              {/* Permanent QR Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <QrCode className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-900">{t.tables.permanentQrCode}</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t.tables.permanentQrDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer URL */}
              {selectedTableForQR.code && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{t.tables.customerUrl}</h4>
                  <code className="text-sm bg-white border border-gray-300 rounded px-2 py-1 block">
                    {process.env.NEXT_PUBLIC_CLIENT_URL || 'https://your-app.com'}/table/{selectedTableForQR.code}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    {t.tables.customerUrlDescription}
                  </p>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </Modal>
    </div>
  );
});

TablesPage.displayName = 'TablesPage';

export default TablesPage;