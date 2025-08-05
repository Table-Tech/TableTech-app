"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { apiClient } from "@/shared/services/api-client";
import { Plus, Settings2, Tag, ExternalLink } from "lucide-react";

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

interface ModifiersTabProps {
  menuItemId?: string;
  restaurantId: string;
}

export function ModifiersTab({ menuItemId, restaurantId }: ModifiersTabProps) {
  const [availableGroups, setAvailableGroups] = useState<ModifierGroup[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModifierGroups = async () => {
    if (!menuItemId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch all available modifier groups for the restaurant
      const availableResponse = await apiClient.getModifierGroups(restaurantId);
      
      // Fetch currently assigned modifier groups for this menu item
      const assignedResponse = await apiClient.getMenuItemModifierGroups(menuItemId);
      
      if (availableResponse.success) {
        setAvailableGroups(availableResponse.data || []);
      }
      
      if (assignedResponse.success) {
        // Add restaurantId to each group since it's required by the interface
        const groupsWithRestaurantId = (assignedResponse.data || []).map(group => ({
          ...group,
          restaurantId
        }));
        setAssignedGroups(groupsWithRestaurantId);
      }
    } catch (error) {
      console.error("Error fetching modifier groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModifierGroups();
  }, [menuItemId, restaurantId]);

  const handleAssignGroup = async (groupId: string) => {
    if (!menuItemId) return;

    try {
      // Call API to assign modifier group to menu item
      // This would need to be implemented in the API
      await apiClient.post(`/menu/staff/items/${menuItemId}/modifier-groups`, {
        modifierGroupId: groupId
      });
      
      await fetchModifierGroups(); // Refresh
    } catch (error) {
      console.error("Error assigning modifier group:", error);
      alert("Failed to assign modifier group. Please try again.");
    }
  };

  const handleUnassignGroup = async (groupId: string) => {
    if (!menuItemId) return;

    if (!confirm("Are you sure you want to remove this modifier group from this menu item?")) {
      return;
    }

    try {
      // Call API to unassign modifier group from menu item
      await apiClient.delete(`/menu/staff/items/${menuItemId}/modifier-groups/${groupId}`);
      
      await fetchModifierGroups(); // Refresh
    } catch (error) {
      console.error("Error unassigning modifier group:", error);
      alert("Failed to remove modifier group. Please try again.");
    }
  };

  // Filter out assigned groups from available groups
  const unassignedGroups = availableGroups.filter(
    group => !assignedGroups.some(assigned => assigned.id === group.id)
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("/modifier-groups", "_blank")}
          className="text-indigo-600 hover:text-indigo-700 border-indigo-200"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Manage Groups
        </Button>
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
                        {modifier.name} {modifier.price > 0 && `(+$${Number(modifier.price).toFixed(2)})`}
                      </span>
                    ))}
                    {group.modifiers.length > 3 && (
                      <span className="text-green-600 text-xs px-2 py-1">
                        +{group.modifiers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnassignGroup(group.id)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  Remove
                </Button>
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
                        {modifier.name} {modifier.price > 0 && `(+$${Number(modifier.price).toFixed(2)})`}
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
                  className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}