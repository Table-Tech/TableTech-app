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
      console.error("Error fetching modifier groups:", error);
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
      // Refresh modifier groups when user returns to the tab
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
          You need to save this menu item before you can assign modifier groups to it.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading modifier groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with link to manage global modifier groups */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings2 className="w-5 h-5 mr-2 text-indigo-600" />
            Menu Item Customizations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign existing modifier groups to this menu item
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
            Manage Groups
          </Button>
        </div>
      </div>

      {/* Currently Assigned Groups */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
          <Tag className="w-4 h-4 mr-2 text-green-600" />
          Assigned Modifier Groups
        </h4>
        
        {assignedGroups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No modifier groups assigned yet</p>
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
                    onClick={() => setCustomizingTemplate(group.templateId || group.id)}
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
          Available Modifier Groups
        </h4>
        
        {unassignedGroups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Settings2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">
              {availableGroups.length === 0 
                ? "No modifier groups created yet" 
                : "All available modifier groups are already assigned"
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {availableGroups.length === 0 
                ? "Create modifier groups in the Modifier Groups management section"
                : "Create more modifier groups or remove existing assignments to see more options"
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
        onClose={() => setCustomizingTemplate(null)}
        title="Customize Template for This Item"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">🎯 Item-Specific Customization</h4>
            <p className="text-sm text-blue-700">
              Customize how this template appears for this specific menu item without affecting other items.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Template Settings</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Required for this item</label>
                    <p className="text-xs text-gray-500">Customer must select from this template</p>
                  </div>
                  <Switch
                    id="required-toggle"
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Name (optional)
                    </label>
                    <Input
                      placeholder="e.g., Pizza Size"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <Input
                      type="number"
                      defaultValue={0}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Option Overrides</h5>
              <p className="text-sm text-gray-600 mb-4">
                Customize individual options for this menu item
              </p>
              
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Small Size</span>
                    <Switch
                      id="option-small-visible"
                      checked={true}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Custom name" className="text-xs" />
                    <CurrencyInput
                      value={0}
                      onChange={() => {}}
                      placeholder="€0,00"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="text-center py-2">
                  <p className="text-xs text-gray-500">More options will appear here based on the selected template</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCustomizingTemplate(null)}
            >
              Cancel
            </Button>
            <Button onClick={() => setCustomizingTemplate(null)}>
              Save Customizations
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}