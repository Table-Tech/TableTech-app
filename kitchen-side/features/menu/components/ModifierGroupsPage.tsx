"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { apiClient } from "@/shared/services/api-client";
import { Plus, Edit2, Trash2, Settings2, Tag } from "lucide-react";

interface ModifierTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  options: Array<{
    id: string;
    name: string;
    price: number;
    displayOrder: number;
    isActive: boolean;
  }>;
  _count: { menuItems: number };
}

interface ModifierGroupsPageProps {
  restaurantId: string;
  onClose: () => void;
}

export function ModifierGroupsPage({ restaurantId, onClose }: ModifierGroupsPageProps) {
  const [modifierTemplates, setModifierTemplates] = useState<ModifierTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ModifierTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editingOption, setEditingOption] = useState<any>(null);

  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    type: "SINGLE_CHOICE" as "SINGLE_CHOICE" | "MULTIPLE_CHOICE",
  });

  const [optionFormData, setOptionFormData] = useState({
    name: "",
    price: 0,
  });

  const fetchModifierTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getModifierTemplates();
      if (response.success && Array.isArray(response.data)) {
        setModifierTemplates(response.data);
      }
    } catch (error) {
      console.error("Error fetching modifier templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModifierTemplates();
  }, [restaurantId]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: "",
      description: "",
      type: "SINGLE_CHOICE",
    });
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: ModifierTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || "",
      type: template.type,
    });
    setIsTemplateModalOpen(true);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateFormData.name.trim()) {
      alert("Template name is required");
      return;
    }

    try {
      if (editingTemplate) {
        await apiClient.updateModifierTemplate(editingTemplate.id, templateFormData);
      } else {
        await apiClient.createModifierTemplate({
          ...templateFormData,
          options: [], // Start with no options - they'll be added separately
        });
      }
      setIsTemplateModalOpen(false);
      await fetchModifierTemplates();
    } catch (error) {
      console.error("Error saving modifier template:", error);
      alert("Failed to save modifier template. Please try again.");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this modifier template? This will remove it from all menu items.")) {
      return;
    }

    try {
      await apiClient.deleteModifierTemplate(templateId);
      await fetchModifierTemplates();
    } catch (error) {
      console.error("Error deleting modifier template:", error);
      alert("Failed to delete modifier template. Please try again.");
    }
  };

  const handleAddOption = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditingOption(null);
    setOptionFormData({
      name: "",
      price: 0,
    });
    setIsOptionModalOpen(true);
  };

  const handleEditOption = (option: any, templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditingOption(option);
    setOptionFormData({
      name: option.name,
      price: option.price,
    });
    setIsOptionModalOpen(true);
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!optionFormData.name.trim()) {
      alert("Option name is required");
      return;
    }

    if (optionFormData.price < 0) {
      alert("Price cannot be negative");
      return;
    }

    try {
      if (editingOption) {
        await apiClient.updateTemplateOption(selectedTemplateId, editingOption.id, {
          name: optionFormData.name,
          price: optionFormData.price,
        });
      } else {
        const selectedTemplate = modifierTemplates.find(t => t.id === selectedTemplateId);
        await apiClient.addOptionToTemplate(selectedTemplateId, {
          name: optionFormData.name,
          price: optionFormData.price,
          displayOrder: selectedTemplate?.options?.length || 0,
        });
      }
      setIsOptionModalOpen(false);
      await fetchModifierTemplates();
    } catch (error) {
      console.error("Error saving option:", error);
      alert("Failed to save option. Please try again.");
    }
  };

  const handleDeleteOption = async (templateId: string, optionId: string) => {
    if (!confirm("Are you sure you want to delete this option?")) {
      return;
    }

    try {
      await apiClient.deleteTemplateOption(templateId, optionId);
      await fetchModifierTemplates();
    } catch (error) {
      console.error("Error deleting option:", error);
      alert("Failed to delete option. Please try again.");
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
            <p className="text-gray-700 font-medium">Loading modifier templates...</p>
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
                Modifier Templates
              </h1>
              <p className="text-gray-600 text-sm">Create and manage reusable modifier templates for your menu items</p>
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
                onClick={handleCreateTemplate}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Modifier Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {modifierTemplates.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings2 className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No modifier templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first modifier template to get started with menu customizations</p>
            <Button 
              onClick={handleCreateTemplate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Modifier Template
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {modifierTemplates.map((template) => (
              <div key={template.id} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                {/* Template Header */}
                <div className="p-6 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {template.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            template.type === 'MULTIPLE_CHOICE' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {template.type === 'MULTIPLE_CHOICE' ? 'Multi-select' : 'Single-select'}
                          </span>
                          {!template.isActive && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-2 ml-6">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {template.options.length} options
                      </div>
                      <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        {template._count.menuItems} items
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Options List */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-indigo-600" />
                      Template Options
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddOption(template.id)}
                      className="bg-white/50 hover:bg-white/80"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {template.options.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No options yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add options like "Extra Cheese", "Large Size", etc.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {template.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border border-gray-200/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-900">{option.name}</h5>
                              {!option.isActive && (
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {option.price > 0 ? `+€${Number(option.price).toFixed(2)}` : 'No extra charge'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOption(option, template.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOption(template.id, option.id)}
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

      {/* Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={editingTemplate ? 'Edit Modifier Template' : 'Create Modifier Template'}
      >
        <form onSubmit={handleTemplateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={templateFormData.name}
              onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Size, Extras, Cooking Style"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={templateFormData.description}
              onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this template is for..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selection Type
            </label>
            <select
              value={templateFormData.type}
              onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value as "SINGLE_CHOICE" | "MULTIPLE_CHOICE" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="SINGLE_CHOICE">Single Choice (pick one)</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice (pick many)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Option Modal */}
      <Modal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        title={editingOption ? 'Edit Template Option' : 'Add Template Option'}
      >
        <form onSubmit={handleOptionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Option Name *
            </label>
            <input
              type="text"
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Extra Cheese, Large Size, Spicy"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Price (€)
            </label>
            <CurrencyInput
              value={optionFormData.price}
              onChange={(value) => setOptionFormData({ ...optionFormData, price: value })}
              placeholder="€0,00"
              min={0}
              max={99.99}
            />
            <p className="text-xs text-gray-500 mt-1">💡 Enter €0,00 for no additional charge</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOptionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingOption ? 'Update' : 'Add'} Option
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}