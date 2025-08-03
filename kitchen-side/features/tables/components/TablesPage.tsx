"use client";

import React, { useState, useMemo } from 'react';
import { useTables } from '../hooks/useTables';
import { Button, Input, LoadingSpinner, EmptyState } from '@/shared/components/ui';
import { ModernSelect } from '@/shared/components/ui/ModernSelect';
import { Wifi, WifiOff, RefreshCw, Plus, QrCode, Download, Eye } from 'lucide-react';
import { ErrorBoundary } from '@/shared/components/error';
import { AddTableModal } from './AddTableModal';
import { Modal } from '@/shared/components/ui/Modal';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import type { TableFilters, Table } from '../types';

// Stats Card Component
interface StatsCardProps {
  label: string;
  value: number;
  icon: string;
  bgColor: string;
  textColor: string;
  valueColor: string;
}

const StatsCard = ({ label, value, icon, bgColor, textColor, valueColor }: StatsCardProps) => (
  <div className={`${bgColor} p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${textColor}`}>{label}</p>
        <p className={`text-3xl font-bold ${valueColor} mt-1`}>{value}</p>
      </div>
      <div className="text-2xl opacity-70">{icon}</div>
    </div>
  </div>
);

// Table Card Component
interface TableCardProps {
  table: Table;
  onViewQR: () => void;
  getStatusText: (status: string) => string;
  t: any;
}

const TableCard = ({ table, onViewQR, getStatusText, t }: TableCardProps) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          card: 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50 hover:shadow-green-200/50',
          badge: 'bg-green-100 text-green-800 border border-green-200',
          dot: 'bg-green-500'
        };
      case 'OCCUPIED':
        return {
          card: 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50 hover:shadow-red-200/50',
          badge: 'bg-red-100 text-red-800 border border-red-200',
          dot: 'bg-red-500'
        };
      case 'RESERVED':
        return {
          card: 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200/50 hover:shadow-yellow-200/50',
          badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
          dot: 'bg-yellow-500'
        };
      default:
        return {
          card: 'bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200/50 hover:shadow-gray-200/50',
          badge: 'bg-gray-100 text-gray-800 border border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  const statusStyle = getStatusStyle(table.status);

  return (
    <div className={`${statusStyle.card} p-5 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 backdrop-blur-sm transform hover:scale-105`}>
      <div className="text-center space-y-3">
        {/* Table Header */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${statusStyle.dot}`}></div>
          <h3 className="text-lg font-bold text-gray-900">
            {t.tables.table} {table.number}
          </h3>
        </div>
        
        {/* Capacity */}
        <div className="flex items-center justify-center space-x-1 text-gray-600">
          <span className="text-sm">👥</span>
          <span className="text-sm font-medium">{table.capacity} {t.tables.seats}</span>
        </div>
        
        {/* Table Code */}
        {table.code && (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-200/50">
            <p className="text-xs text-gray-600 font-mono">
              {t.tables.code}: {table.code}
            </p>
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`${statusStyle.badge} px-3 py-1 text-xs font-medium rounded-full inline-block`}>
          {getStatusText(table.status)}
        </div>

        {/* QR Code Button */}
        {table.qrCodeUrl && (
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onViewQR}
              className="w-full bg-white/70 backdrop-blur-sm border-gray-200/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 text-gray-700 hover:text-gray-900"
            >
              <QrCode className="w-3 h-3 mr-2" />
              {t.tables.viewQr}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-gray-700 font-medium">{t.tables.loading || 'Loading tables...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-red-200/50 p-12 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-4">{t.common.error}: {error}</p>
            <Button 
              onClick={refetch}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t.tables.retry || 'Try Again'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                {t.tables.title}
              </h1>
              <p className="text-gray-600 text-sm">{t.tables.manageTablesDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm border transition-all duration-200 ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50/80 border-green-200/50 text-green-700' 
                  : 'bg-red-50/80 border-red-200/50 text-red-700'
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
                className="bg-white/50 backdrop-blur-sm hover:bg-white/80 border-gray-200/50 text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.tables.refresh}
              </Button>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.tables.addTable}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            label={t.tables.total}
            value={tableStats.total}
            icon="🏪"
            bgColor="bg-gradient-to-br from-gray-50 to-slate-100"
            textColor="text-gray-700"
            valueColor="text-gray-900"
          />
          <StatsCard
            label={t.tables.available}
            value={tableStats.available}
            icon="✅"
            bgColor="bg-gradient-to-br from-green-50 to-emerald-100"
            textColor="text-green-600"
            valueColor="text-green-700"
          />
          <StatsCard
            label={t.tables.occupied}
            value={tableStats.occupied}
            icon="🔴"
            bgColor="bg-gradient-to-br from-red-50 to-rose-100"
            textColor="text-red-600"
            valueColor="text-red-700"
          />
          <StatsCard
            label={t.tables.reserved}
            value={tableStats.reserved}
            icon="⏰"
            bgColor="bg-gradient-to-br from-yellow-50 to-amber-100"
            textColor="text-yellow-600"
            valueColor="text-yellow-700"
          />
          <StatsCard
            label={t.tables.outOfOrder}
            value={tableStats.outOfOrder}
            icon="🚫"
            bgColor="bg-gradient-to-br from-gray-50 to-gray-100"
            textColor="text-gray-600"
            valueColor="text-gray-700"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-6 relative z-20">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder={t.tables.searchTables}
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="bg-white/80 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200"
              />
            </div>
            <div className="lg:w-64 relative z-30">
              <ModernSelect
                value={filters.status || ''}
                onChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  status: value as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_ORDER' | undefined || undefined 
                }))}
                placeholder={t.tables.allStatuses}
                options={[
                  { label: t.tables.allStatuses, value: '', icon: '🔄' },
                  { label: t.tables.available, value: 'AVAILABLE', icon: '✅', color: 'text-green-700' },
                  { label: t.tables.occupied, value: 'OCCUPIED', icon: '🔴', color: 'text-red-700' },
                  { label: t.tables.reserved, value: 'RESERVED', icon: '⏰', color: 'text-yellow-700' },
                  { label: t.tables.outOfOrder, value: 'OUT_OF_ORDER', icon: '🚫', color: 'text-gray-700' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {tables.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🏪</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.tables.noTablesFound}</h3>
            <p className="text-gray-600 mb-6">{t.tables.createFirstTable}</p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.tables.addTable}
            </Button>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <ErrorBoundary 
              level="section" 
              name="TablesGrid"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {tables.map((table) => (
                  <ErrorBoundary 
                    key={table.id}
                    level="component" 
                    name={`TableCard-${table.number}`}
                  >
                    <TableCard
                      table={table}
                      onViewQR={() => setSelectedTableForQR(table)}
                      getStatusText={getStatusText}
                      t={t}
                    />
                  </ErrorBoundary>
                ))}
              </div>
            </ErrorBoundary>
          </div>
        )}
      </div>

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