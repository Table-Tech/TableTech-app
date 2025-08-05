"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { apiClient } from "@/shared/services/api-client";
import { Plus, Edit2, Trash2, Settings2, Tag } from "lucide-react";

interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect?: number;
  displayOrder: number;
  isActive: boolean;
  restaurantId: string;
  modifiers: Array<{
    id: string;
    name: string;
    price: number;
    displayOrder: number;
    isActive: boolean;
    modifierGroupId: string;
  }>;
}

interface ModifierGroupsPageProps {
  restaurantId: string;
  onClose: () => void;
}

export function ModifierGroupsPage({ restaurantId, onClose }: ModifierGroupsPageProps) {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [editingModifier, setEditingModifier] = useState<any>(null);

  const [groupFormData, setGroupFormData] = useState({
    name: "",
    required: false,
    multiSelect: false,
    minSelect: 1,
    maxSelect: undefined as number | undefined,
  });

  const [modifierFormData, setModifierFormData] = useState({
    name: "",
    price: 0,
  });

  const fetchModifierGroups = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getModifierGroups(restaurantId);
      if (response.success) {
        setModifierGroups(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching modifier groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModifierGroups();
  }, [restaurantId]);

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: "",
      required: false,
      multiSelect: false,
      minSelect: 1,
      maxSelect: undefined,
    });
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      required: group.required,
      multiSelect: group.multiSelect,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
    });
    setIsGroupModalOpen(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupFormData.name.trim()) {
      alert("Group name is required");
      return;
    }

    if (groupFormData.multiSelect && groupFormData.maxSelect && groupFormData.maxSelect < groupFormData.minSelect) {
      alert("Maximum selections cannot be less than minimum selections");
      return;
    }

    try {
      if (editingGroup) {
        await apiClient.updateModifierGroup(editingGroup.id, groupFormData);
      } else {
        await apiClient.createModifierGroup({
          ...groupFormData,
          restaurantId,
          displayOrder: modifierGroups.length,
        });
      }
      setIsGroupModalOpen(false);
      await fetchModifierGroups();
    } catch (error) {
      console.error("Error saving modifier group:", error);
      alert("Failed to save modifier group. Please try again.");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this modifier group?")) {
      return;
    }

    try {
      await apiClient.deleteModifierGroup(groupId);
      await fetchModifierGroups();
    } catch (error) {
      console.error("Error deleting modifier group:", error);
      alert("Failed to delete modifier group. Please try again.");
    }
  };

  const handleAddModifier = (groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingModifier(null);
    setModifierFormData({
      name: "",
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

  const handleModifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modifierFormData.name.trim()) {
      alert("Modifier name is required");
      return;
    }

    if (modifierFormData.price < 0) {
      alert("Price cannot be negative");
      return;
    }

    try {
      if (editingModifier) {
        await apiClient.updateModifier(editingModifier.id, {
          name: modifierFormData.name,
          price: modifierFormData.price,
        });
      } else {
        const selectedGroup = modifierGroups.find(g => g.id === selectedGroupId);
        await apiClient.createModifier({
          name: modifierFormData.name,
          modifierGroupId: selectedGroupId,
          price: modifierFormData.price,
          displayOrder: selectedGroup?.modifiers?.length || 0,
        });
      }
      setIsModifierModalOpen(false);
      await fetchModifierGroups();
    } catch (error) {
      console.error("Error saving modifier:", error);
      alert("Failed to save modifier. Please try again.");
    }
  };

  const handleDeleteModifier = async (modifierId: string) => {
    if (!confirm("Are you sure you want to delete this modifier option?")) {
      return;
    }

    try {
      await apiClient.deleteModifier(modifierId);
      await fetchModifierGroups();
    } catch (error) {
      console.error("Error deleting modifier:", error);
      alert("Failed to delete modifier. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center py-12">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-gray-700 font-medium">Loading modifier groups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="bg-gradient-to-br from-white/70 via-green-50/60 to-emerald-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                <Settings2 className="w-8 h-8 inline mr-3 text-indigo-600" />
                Modifier Groups
              </h1>
              <p className="text-gray-600 text-sm">Create and manage reusable modifier groups for your menu items</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline"
                onClick={onClose}
                className="bg-white/50 backdrop-blur-sm hover:bg-white/80 border-gray-200/50 text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
              >
                ← Back to Menu
              </Button>
              <Button 
                onClick={handleCreateGroup}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Modifier Group
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {modifierGroups.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings2 className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No modifier groups yet</h3>
            <p className="text-gray-600 mb-6">Create your first modifier group to get started with menu customizations</p>
            <Button 
              onClick={handleCreateGroup}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Modifier Group
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {modifierGroups.map((group) => (
              <div key={group.id} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                {/* Group Header */}
                <div className="p-6 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {group.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {group.required && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                              Required
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.multiSelect 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {group.multiSelect ? 'Multi-select' : 'Single-select'}
                          </span>
                        </div>
                      </div>
                      {group.multiSelect && (
                        <p className="text-sm text-gray-600 mt-2 ml-6">
                          Min: {group.minSelect}, Max: {group.maxSelect || 'unlimited'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {group.modifiers.length} options
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditGroup(group)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Modifiers List */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-indigo-600" />
                      Modifier Options
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddModifier(group.id)}
                      className="bg-white/50 hover:bg-white/80"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {group.modifiers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No modifier options yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add options like "Extra Cheese", "Large Size", etc.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {group.modifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border border-gray-200/50"
                        >
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{modifier.name}</h5>
                            <p className="text-sm text-gray-600">
                              {modifier.price > 0 ? `+$${Number(modifier.price).toFixed(2)}` : 'No extra charge'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditModifier(modifier, group.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModifier(modifier.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={editingGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={groupFormData.name}
              onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Size, Extras, Cooking Style"
            />
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupFormData.required}
                onChange={(e) => setGroupFormData({ ...groupFormData, required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Required</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupFormData.multiSelect}
                onChange={(e) => setGroupFormData({ ...groupFormData, multiSelect: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Allow multiple selections</span>
            </label>
          </div>

          {groupFormData.multiSelect && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum selections
                </label>
                <input
                  type="number"
                  min="0"
                  value={groupFormData.minSelect}
                  onChange={(e) => setGroupFormData({ ...groupFormData, minSelect: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum selections (optional)
                </label>
                <input
                  type="number"
                  min={groupFormData.minSelect}
                  value={groupFormData.maxSelect || ""}
                  onChange={(e) => setGroupFormData({ 
                    ...groupFormData, 
                    maxSelect: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Unlimited"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsGroupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleGroupSubmit}>
              {editingGroup ? 'Update' : 'Create'} Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modifier Modal */}
      <Modal
        isOpen={isModifierModalOpen}
        onClose={() => setIsModifierModalOpen(false)}
        title={editingModifier ? 'Edit Modifier Option' : 'Add Modifier Option'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Option Name
            </label>
            <input
              type="text"
              value={modifierFormData.name}
              onChange={(e) => setModifierFormData({ ...modifierFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Extra Cheese, Large Size, Spicy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={modifierFormData.price}
              onChange={(e) => setModifierFormData({ ...modifierFormData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Enter 0 for no additional charge</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsModifierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleModifierSubmit}>
              {editingModifier ? 'Update' : 'Add'} Option
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}