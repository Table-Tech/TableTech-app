/**
 * Modifiers Tab Component
 * Complete modifier groups and modifiers management interface
 */

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useModifierGroups, ModifierGroup, CreateModifierGroupData } from '../hooks/useModifierGroups';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import { apiClient } from '@/shared/services/api-client';
import { 
  Plus, 
  Settings, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  DollarSign,
  Hash,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface ModifiersTabProps {
  menuItemId: string;
  restaurantId: string;
}

interface ModifierFormData {
  name: string;
  price: number;
}

export function ModifiersTab({ menuItemId, restaurantId }: ModifiersTabProps) {
  const t = useTranslation();
  const {
    modifierGroups,
    isLoading,
    error,
    fetchModifierGroups,
    createModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
  } = useModifierGroups(restaurantId);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingModifier, setEditingModifier] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const [groupFormData, setGroupFormData] = useState<CreateModifierGroupData>({
    name: '',
    restaurantId: restaurantId,
    required: false,
    multiSelect: false,
    minSelect: 0,
    maxSelect: undefined,
    displayOrder: 0,
  });

  const [modifierFormData, setModifierFormData] = useState<ModifierFormData>({
    name: '',
    price: 0,
  });

  useEffect(() => {
    if (menuItemId) {
      fetchModifierGroups();
    }
  }, [menuItemId]);

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: '',
      restaurantId: restaurantId,
      required: false,
      multiSelect: false,
      minSelect: 0,
      maxSelect: undefined,
      displayOrder: modifierGroups.length,
    });
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      restaurantId: group.restaurantId,
      required: group.required,
      multiSelect: group.multiSelect,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      displayOrder: group.displayOrder,
    });
    setIsGroupModalOpen(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupFormData.name.trim()) {
      alert('Group name is required');
      return;
    }

    if (groupFormData.multiSelect && groupFormData.maxSelect && groupFormData.maxSelect < groupFormData.minSelect) {
      alert('Maximum selections cannot be less than minimum selections');
      return;
    }

    try {
      if (editingGroup) {
        await updateModifierGroup(editingGroup.id, groupFormData);
      } else {
        await createModifierGroup(groupFormData);
      }
      setIsGroupModalOpen(false);
    } catch (error) {
      console.error('Error saving modifier group:', error);
      alert('Failed to save modifier group. Please try again.');
    }
  };

  const handleAddModifier = (groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingModifier(null);
    const group = modifierGroups.find(g => g.id === groupId);
    setModifierFormData({
      name: '',
      price: 0,
    });
    setIsModifierModalOpen(true);
  };

  const handleEditModifier = (modifier: any, groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingModifier(modifier);
    setModifierFormData({
      name: modifier.name,
      price: modifier.price,
    });
    setIsModifierModalOpen(true);
  };

  const handleDeleteModifier = async (modifierId: string) => {
    if (!confirm('Are you sure you want to delete this modifier option?')) {
      return;
    }

    try {
      await apiClient.deleteModifier(modifierId);
      await fetchModifierGroups(); // Refresh
    } catch (error) {
      console.error('Error deleting modifier:', error);
      alert('Failed to delete modifier. Please try again.');
    }
  };

  const handleModifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modifierFormData.name.trim()) {
      alert('Modifier name is required');
      return;
    }

    if (modifierFormData.price < 0) {
      alert('Price cannot be negative');
      return;
    }

    try {
      if (editingModifier) {
        // Update modifier
        await apiClient.updateModifier(editingModifier.id, {
          name: modifierFormData.name,
          price: modifierFormData.price,
        });
      } else {
        // Create modifier
        const selectedGroup = modifierGroups.find(g => g.id === selectedGroupId);
        await apiClient.createModifier({
          name: modifierFormData.name,
          modifierGroupId: selectedGroupId,
          price: modifierFormData.price,
          displayOrder: selectedGroup?.modifiers?.length || 0,
        });
      }
      setIsModifierModalOpen(false);
      await fetchModifierGroups(); // Refresh
    } catch (error) {
      console.error('Error saving modifier:', error);
      alert('Failed to save modifier. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading modifiers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchModifierGroups}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Modifier Groups</h3>
          <p className="text-sm text-gray-500">Add customization options for this menu item</p>
        </div>
        <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Group</span>
        </Button>
      </div>

      {/* Modifier Groups List */}
      {modifierGroups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No modifier groups yet</h3>
          <p className="text-gray-500 mb-4">Add your first modifier group to get started</p>
          <Button onClick={handleCreateGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Add Modifier Group
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {modifierGroups.map((group) => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-lg shadow">
              {/* Group Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleGroupExpansion(group.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{group.name}</span>
                        {group.required && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                        {group.multiSelect ? (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                            Multi-select
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            Single-select
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {group.modifiers?.length || 0} options
                        {group.multiSelect && (
                          <span>
                            {' • '}
                            Min: {group.minSelect}
                            {group.maxSelect && ` • Max: ${group.maxSelect}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteModifierGroup(group.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Group Content */}
              {expandedGroups.has(group.id) && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-700">Modifier Options</h5>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddModifier(group.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  {group.modifiers && group.modifiers.length > 0 ? (
                    <div className="space-y-2">
                      {group.modifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{modifier.name}</span>
                            <span className="text-gray-500 flex items-center">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {modifier.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditModifier(modifier, group.id)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModifier(modifier.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No modifier options yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddModifier(group.id)}
                        className="mt-2"
                      >
                        Add first option
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modifier Group Form Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={editingGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
      >
        <form onSubmit={handleGroupSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <Input
              value={groupFormData.name}
              onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
              placeholder="e.g., Size, Extras, Cooking Style"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={groupFormData.required}
                onChange={(e) => setGroupFormData({ ...groupFormData, required: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Required selection
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="multiSelect"
                checked={groupFormData.multiSelect}
                onChange={(e) => setGroupFormData({ 
                  ...groupFormData, 
                  multiSelect: e.target.checked,
                  maxSelect: e.target.checked ? groupFormData.maxSelect : 1
                })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="multiSelect" className="ml-2 text-sm text-gray-700">
                Allow multiple selections
              </label>
            </div>
          </div>

          {groupFormData.multiSelect && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum selections
                </label>
                <Input
                  type="number"
                  min="0"
                  value={groupFormData.minSelect}
                  onChange={(e) => setGroupFormData({ 
                    ...groupFormData, 
                    minSelect: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum selections
                </label>
                <Input
                  type="number"
                  min="1"
                  value={groupFormData.maxSelect || ''}
                  onChange={(e) => setGroupFormData({ 
                    ...groupFormData, 
                    maxSelect: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="No limit"
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingGroup ? 'Update Group' : 'Create Group'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGroupModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modifier Form Modal */}
      <Modal
        isOpen={isModifierModalOpen}
        onClose={() => setIsModifierModalOpen(false)}
        title={editingModifier ? 'Edit Modifier Option' : 'Add Modifier Option'}
      >
        <form onSubmit={handleModifierSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Option Name
            </label>
            <Input
              value={modifierFormData.name}
              onChange={(e) => setModifierFormData({ ...modifierFormData, name: e.target.value })}
              placeholder="e.g., Large, Extra Cheese, Well Done"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={modifierFormData.price}
                onChange={(e) => setModifierFormData({ 
                  ...modifierFormData, 
                  price: parseFloat(e.target.value) || 0 
                })}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Additional cost for this option (0.00 for no extra charge)
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingModifier ? 'Update Option' : 'Add Option'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModifierModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}