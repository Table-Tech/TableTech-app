"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { Switch } from "@/shared/components/ui/Switch";
import { apiClient } from "@/shared/services/api-client";
import { Plus, Settings2, Tag, ExternalLink } from "lucide-react";

interface ModifierGroup {
  id: string;
  templateId?: string; // Template ID for filtering (only on assigned groups)
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

interface ModifiersTabProps {
  menuItemId?: string;
  restaurantId: string;
}

interface TemplateAssignment {
  id: string;
  displayName?: string;
  required: boolean;
  minSelect: number;
  maxSelect?: number;
  displayOrder: number;
  template: {
    id: string;
    name: string;
    type: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
      displayOrder: number;
    }>;
  };
  optionOverrides: Array<{
    id: string;
    optionId: string;
    isHidden: boolean;
    priceOverride: number | null;
    nameOverride: string | null;
    isDefault: boolean;
  }>;
}

interface CustomizationFormData {
  displayName: string;
  required: boolean;
  minSelect: number;
  maxSelect?: number;
  displayOrder: number;
  optionOverrides: Record<string, {
    isHidden: boolean;
    nameOverride: string;
    priceOverride: number | null;
    isDefault: boolean;
  }>;
}

// Helper function to convert price values to numbers
const convertToNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value === 'object' && value.toString) {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
};

export function ModifiersTab({ menuItemId, restaurantId }: ModifiersTabProps) {
  const [availableGroups, setAvailableGroups] = useState<ModifierGroup[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null);
  const [customizingTemplate, setCustomizingTemplate] = useState<string | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<TemplateAssignment | null>(null);
  const [customizationForm, setCustomizationForm] = useState<CustomizationFormData>({
    displayName: '',
    required: false,
    minSelect: 0,
    maxSelect: undefined,
    displayOrder: 0,
    optionOverrides: {}
  });
  const [isLoadingCustomization, setIsLoadingCustomization] = useState(false);
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);

  // Debug form state changes
  useEffect(() => {
    console.log('📝 CustomizationForm state updated:', customizationForm);
  }, [customizationForm]);

  const fetchModifierGroups = async () => {
    if (!menuItemId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch all available modifier templates for the restaurant
      const availableResponse = await apiClient.getModifierTemplates();
      
      // Fetch currently assigned modifier templates for this menu item
      const assignedResponse = await apiClient.getMenuItemModifierTemplates(menuItemId);
      
      if (availableResponse.success && availableResponse.data) {
        // Transform template data to match component interface
        const templateData = availableResponse.data as unknown as any[];
        const templates = templateData.map((template: any) => ({
          id: template.id,
          name: template.name,
          required: false, // Templates themselves aren't required, assignments are
          multiSelect: template.type === 'MULTIPLE_CHOICE',
          minSelect: 0,
          maxSelect: template.type === 'SINGLE_CHOICE' ? 1 : undefined,
          displayOrder: 0,
          isActive: template.isActive,
          restaurantId: restaurantId,
          modifiers: template.options.map((option: any) => ({
            id: option.id,
            name: option.name,
            price: convertToNumber(option.price),
            displayOrder: option.displayOrder,
            isActive: option.isActive,
            modifierGroupId: template.id
          }))
        }));
        setAvailableGroups(templates);
      }
      
      if (assignedResponse.success && assignedResponse.data) {
        // Transform assignment data to match component interface
        const assignmentData = assignedResponse.data as unknown as any[];
        const assignments = assignmentData.map((assignment: any) => ({
          id: assignment.id,
          templateId: assignment.template.id, // Store template ID for filtering
          name: assignment.displayName || assignment.template.name,
          required: assignment.required,
          multiSelect: assignment.template.type === 'MULTIPLE_CHOICE',
          minSelect: assignment.minSelect,
          maxSelect: assignment.maxSelect,
          displayOrder: assignment.displayOrder,
          isActive: true,
          restaurantId: restaurantId,
          modifiers: assignment.template.options.map((option: any) => {
            // Apply overrides
            const override = assignment.optionOverrides?.find((o: any) => o.optionId === option.id);
            return {
              id: option.id,
              name: override?.nameOverride || option.name,
              price: override?.priceOverride !== null && override?.priceOverride !== undefined ? convertToNumber(override.priceOverride) : convertToNumber(option.price),
              displayOrder: option.displayOrder,
              isActive: !override?.isHidden,
              modifierGroupId: assignment.template.id
            };
          }).filter((modifier: any) => modifier.isActive) // Filter out hidden options
        }));
        setAssignedGroups(assignments);
      }
    } catch (error) {
      console.error("Error fetching modifier templates:", error);
      // Reset to empty states on error to prevent stale data
      setAvailableGroups([]);
      setAssignedGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModifierGroups();
  }, [menuItemId, restaurantId]);

  // Refresh data when the tab/window gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Refresh modifier templates when user returns to the tab
      fetchModifierGroups();
    };

    // Add event listeners for both window focus and visibility change
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [menuItemId, restaurantId]);

  const handleAssignGroup = async (groupId: string) => {
    if (!menuItemId || isAssigning) return;

    setIsAssigning(groupId);
    try {
      // Use the new template assignment API
      const response = await apiClient.assignTemplateToMenuItem(menuItemId, {
        templateId: groupId,
        required: false,
        minSelect: 0,
        displayOrder: 0
      });
      
      if (response.success) {
        await fetchModifierGroups(); // Refresh the lists
        // Success feedback could be shown here with a toast notification
      } else {
        throw new Error(response.error || "Failed to assign modifier template");
      }
    } catch (error) {
      console.error("Error assigning modifier template:", error);
      // In production, replace with proper toast notification
      alert("Failed to assign modifier template. Please try again.");
    } finally {
      setIsAssigning(null);
    }
  };

  const fetchAssignmentData = async (templateId: string) => {
    if (!menuItemId) return;

    setIsLoadingCustomization(true);
    try {
      const response = await apiClient.getMenuItemModifierTemplates(menuItemId);
      console.log('📋 Fetched assignments response:', response);
      
      // Handle both response.success pattern and direct data response
      const assignmentData = response.data || response;
      console.log('📊 Assignment data:', assignmentData);
      
      if (Array.isArray(assignmentData)) {
        console.log('🔍 Looking for templateId:', templateId);
        console.log('📊 Available assignments:', assignmentData.map((a: any) => ({
          id: a.id,
          templateId: a.template?.id || a.templateId,
          required: a.required,
          displayName: a.displayName
        })));
        
        // Try to find by template.id or templateId
        const assignment = assignmentData.find((a: any) => 
          a.template?.id === templateId || a.templateId === templateId
        );
        
        console.log('✅ Found assignment:', JSON.stringify(assignment, null, 2));
        
        if (assignment) {
          setCurrentAssignment(assignment);
          
          // Initialize form with current assignment data
          const optionOverrides: Record<string, any> = {};
          
          // Ensure we have template options
          if (assignment.template && assignment.template.options) {
            assignment.template.options.forEach((option: any) => {
              const override = assignment.optionOverrides?.find((o: any) => o.optionId === option.id);
              optionOverrides[option.id] = {
                isHidden: override?.isHidden || false,
                nameOverride: override?.nameOverride || '',
                priceOverride: override && override.priceOverride !== null ? convertToNumber(override.priceOverride) : null,
                isDefault: override?.isDefault || false
              };
            });
          }

          console.log('🎯 Setting form state with:', {
            displayName: assignment.displayName || assignment.template?.name || '',
            required: assignment.required,
            minSelect: assignment.minSelect,
            maxSelect: assignment.maxSelect,
            displayOrder: assignment.displayOrder
          });

          setCustomizationForm({
            displayName: assignment.displayName || assignment.template?.name || '',
            required: Boolean(assignment.required), // Ensure boolean value
            minSelect: assignment.minSelect || 0,
            maxSelect: assignment.maxSelect || undefined,
            displayOrder: assignment.displayOrder || 0,
            optionOverrides
          });
        } else {
          console.log('⚠️ No assignment found for templateId:', templateId);
        }
      } else {
        console.log('⚠️ Assignment data is not an array:', assignmentData);
      }
    } catch (error) {
      console.error('Error fetching assignment data:', error);
    } finally {
      setIsLoadingCustomization(false);
    }
  };

  const handleSaveCustomization = async () => {
    if (!menuItemId || !currentAssignment || !customizingTemplate) return;

    setIsSavingCustomization(true);
    try {
      // Prepare option overrides for API
      const optionOverrides = Object.entries(customizationForm.optionOverrides)
        .map(([optionId, override]) => ({
          optionId,
          isHidden: override.isHidden,
          nameOverride: override.nameOverride || undefined,
          priceOverride: override.priceOverride || undefined,
          isDefault: override.isDefault
        }))
        .filter(override => 
          override.isHidden || 
          override.nameOverride || 
          override.priceOverride !== undefined || 
          override.isDefault
        ); // Only include meaningful overrides

      // Prepare assignment data for update
      const assignmentData = {
        templateId: customizingTemplate,
        displayName: customizationForm.displayName !== currentAssignment.template.name ? customizationForm.displayName : undefined,
        required: customizationForm.required,
        minSelect: customizationForm.minSelect,
        maxSelect: customizationForm.maxSelect,
        displayOrder: customizationForm.displayOrder,
        optionOverrides: optionOverrides.length > 0 ? optionOverrides : undefined
      };
      
      console.log('🚀 Saving customization data:', assignmentData);
      console.log('📊 Option overrides:', optionOverrides);

      // Try to assign template (will handle already assigned case)
      let assignResponse = await apiClient.assignTemplateToMenuItem(menuItemId, assignmentData);
      console.log('📝 Assignment response:', assignResponse);
      
      if (!assignResponse.success) {
        // Check if it's already assigned
        if (assignResponse.error?.includes('already assigned') || assignResponse.error?.includes('ALREADY_ASSIGNED')) {
          console.log('🔄 Template already assigned, updating via unassign + reassign...');
          
          // Unassign first
          const unassignResponse = await apiClient.unassignTemplateFromMenuItem(menuItemId, customizingTemplate);
          console.log('📝 Unassign response:', unassignResponse);
          
          if (!unassignResponse.success) {
            throw new Error(`Failed to unassign template: ${unassignResponse.error}`);
          }
          
          // Then reassign with new data
          assignResponse = await apiClient.assignTemplateToMenuItem(menuItemId, assignmentData);
          console.log('📝 Reassignment response:', assignResponse);
          
          if (!assignResponse.success) {
            throw new Error(`Failed to reassign template: ${assignResponse.error}`);
          }
          
          console.log('✅ Template updated successfully!');
        } else {
          throw new Error(`Assignment failed: ${assignResponse.error}`);
        }
      } else {
        console.log('✅ Template assigned successfully!');
      }

      // Refresh the modifier templates list
      await fetchModifierGroups();
      
      // Close the modal
      setCustomizingTemplate(null);
      setCurrentAssignment(null);
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Failed to save customizations. Please try again.');
    } finally {
      setIsSavingCustomization(false);
    }
  };

  const handleUnassignGroup = async (groupId: string) => {
    if (!menuItemId || isUnassigning) return;

    if (!confirm("Are you sure you want to remove this modifier template from this menu item?")) {
      return;
    }

    setIsUnassigning(groupId);
    try {
      // Use the new template unassignment API
      const response = await apiClient.unassignTemplateFromMenuItem(menuItemId, groupId);
      
      if (response.success) {
        await fetchModifierGroups(); // Refresh the lists
        // Success feedback could be shown here with a toast notification
      } else {
        throw new Error(response.error || "Failed to unassign modifier template");
      }
    } catch (error) {
      console.error("Error unassigning modifier template:", error);
      // In production, replace with proper toast notification
      alert("Failed to remove modifier template. Please try again.");
    } finally {
      setIsUnassigning(null);
    }
  };

  // Filter out assigned templates from available templates
  const unassignedGroups = availableGroups.filter(
    template => !assignedGroups.some(assigned => 
      // Compare template ID from the assigned group
      assigned.templateId === template.id
    )
  );

  if (!menuItemId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Settings2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Save Menu Item First</h3>
        <p className="text-sm text-gray-500">
          You need to save this menu item before you can assign modifier templates to it.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading modifier templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with link to manage global modifier templates */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings2 className="w-5 h-5 mr-2 text-indigo-600" />
            Menu Item Customizations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign existing modifier templates to this menu item
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/dashboard/beheer", "_blank")}
            className="text-indigo-600 hover:text-indigo-700 border-indigo-200"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage Templates
          </Button>
        </div>
      </div>

      {/* Currently Assigned Groups */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
          <Tag className="w-4 h-4 mr-2 text-green-600" />
          Assigned Modifier Templates
        </h4>
        
        {assignedGroups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No modifier templates assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Assign groups below to add customization options</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-green-900">{group.name}</h5>
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
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        {group.modifiers.length} options
                      </span>
                    </div>
                  </div>
                  {group.multiSelect && (
                    <p className="text-sm text-green-700 mt-1">
                      Min: {group.minSelect}, Max: {group.maxSelect || 'unlimited'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.modifiers.slice(0, 3).map((modifier) => (
                      <span
                        key={modifier.id}
                        className="bg-white text-green-700 px-2 py-1 rounded text-xs border border-green-200"
                      >
                        {modifier.name} {modifier.price > 0 && `(+€${Number(modifier.price).toFixed(2)})`}
                      </span>
                    ))}
                    {group.modifiers.length > 3 && (
                      <span className="text-green-600 text-xs px-2 py-1">
                        +{group.modifiers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const templateId = group.templateId || group.id;
                      setCustomizingTemplate(templateId);
                      await fetchAssignmentData(templateId);
                    }}
                    className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                  >
                    Customize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnassignGroup(group.templateId || group.id)}
                    disabled={isUnassigning === (group.templateId || group.id)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 disabled:opacity-50"
                  >
                    {isUnassigning === (group.templateId || group.id) ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Groups to Assign */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
          <Plus className="w-4 h-4 mr-2 text-blue-600" />
          Available Modifier Templates
        </h4>
        
        {unassignedGroups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Settings2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">
              {availableGroups.length === 0 
                ? "No modifier templates created yet" 
                : "All available modifier templates are already assigned"
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {availableGroups.length === 0 
                ? "Create modifier templates in the Modifier Templates management section"
                : "Create more modifier templates or remove existing assignments to see more options"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassignedGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-gray-900">{group.name}</h5>
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
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        {group.modifiers.length} options
                      </span>
                    </div>
                  </div>
                  {group.multiSelect && (
                    <p className="text-sm text-gray-600 mt-1">
                      Min: {group.minSelect}, Max: {group.maxSelect || 'unlimited'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.modifiers.slice(0, 3).map((modifier) => (
                      <span
                        key={modifier.id}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {modifier.name} {modifier.price > 0 && `(+€${Number(modifier.price).toFixed(2)})`}
                      </span>
                    ))}
                    {group.modifiers.length > 3 && (
                      <span className="text-gray-600 text-xs px-2 py-1">
                        +{group.modifiers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAssignGroup(group.id)}
                  disabled={isAssigning === group.id}
                  className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 disabled:opacity-50"
                >
                  {isAssigning === group.id ? (
                    "Assigning..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Assign
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customization Modal */}
      <Modal
        isOpen={!!customizingTemplate}
        onClose={() => {
          console.log('Closing customization modal');
          setCustomizingTemplate(null);
        }}
        title="Customize Template for This Item"
      >
        {isLoadingCustomization ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <p className="ml-3 text-gray-600">Loading template data...</p>
          </div>
        ) : currentAssignment ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🎯 Item-Specific Customization</h4>
              <p className="text-sm text-blue-700">
                Template: <strong>{currentAssignment.template.name}</strong> • Customize how this appears for this specific menu item.
              </p>
            </div>

            {/* Template Settings */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-4">Template Settings</h5>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Required for this item</label>
                    <p className="text-xs text-gray-500">Customer must select from this template</p>
                  </div>
                  <Switch
                    id="required-toggle"
                    checked={customizationForm.required}
                    onChange={(checked) => {
                      console.log('🔄 Switch toggled:', checked);
                      setCustomizationForm(prev => ({ ...prev, required: checked }));
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Display Name (optional)
                    </label>
                    <input
                      type="text"
                      value={customizationForm.displayName}
                      onChange={(e) => setCustomizationForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder={currentAssignment.template.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={customizationForm.displayOrder}
                      onChange={(e) => setCustomizationForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                </div>

                {currentAssignment.template.type === 'MULTIPLE_CHOICE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Selections
                      </label>
                      <input
                        type="number"
                        value={customizationForm.minSelect}
                        onChange={(e) => setCustomizationForm(prev => ({ ...prev, minSelect: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Selections (optional)
                      </label>
                      <input
                        type="number"
                        value={customizationForm.maxSelect || ''}
                        onChange={(e) => setCustomizationForm(prev => ({ ...prev, maxSelect: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Unlimited"
                        min={customizationForm.minSelect}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Option Overrides */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-4">Option Customizations</h5>
              <div className="space-y-3">
                {currentAssignment.template.options.map((option) => {
                  const override = customizationForm.optionOverrides[option.id];
                  return (
                    <div key={option.id} className="bg-white p-4 rounded border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{option.name}</span>
                          <span className="text-sm text-gray-500">€{option.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Visible:</span>
                          <Switch
                            id={`option-${option.id}-visible`}
                            checked={!override?.isHidden}
                            onChange={(checked) => setCustomizationForm(prev => ({
                              ...prev,
                              optionOverrides: {
                                ...prev.optionOverrides,
                                [option.id]: {
                                  ...prev.optionOverrides[option.id],
                                  isHidden: !checked
                                }
                              }
                            }))}
                          />
                        </div>
                      </div>
                      
                      {!override?.isHidden && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Custom Name</label>
                            <input
                              type="text"
                              value={override?.nameOverride || ''}
                              onChange={(e) => setCustomizationForm(prev => ({
                                ...prev,
                                optionOverrides: {
                                  ...prev.optionOverrides,
                                  [option.id]: {
                                    ...prev.optionOverrides[option.id],
                                    nameOverride: e.target.value
                                  }
                                }
                              }))}
                              placeholder={option.name}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Custom Price (€)</label>
                            <CurrencyInput
                              value={override?.priceOverride || option.price}
                              onChange={(value) => setCustomizationForm(prev => ({
                                ...prev,
                                optionOverrides: {
                                  ...prev.optionOverrides,
                                  [option.id]: {
                                    ...prev.optionOverrides[option.id],
                                    priceOverride: value !== option.price ? value : null
                                  }
                                }
                              }))}
                              placeholder={`€${option.price.toFixed(2)}`}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCustomizingTemplate(null);
                  setCurrentAssignment(null);
                }}
                disabled={isSavingCustomization}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCustomization}
                disabled={isSavingCustomization}
              >
                {isSavingCustomization ? 'Saving...' : 'Save Customizations'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load template data.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}