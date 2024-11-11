import { useState, useCallback, useEffect } from 'react';
import { MaterialData, Material, MeshAssignment } from '@/types/material';

interface UseEditorStateProps {
  initialData: MaterialData;
  onUpdate: (data: MaterialData) => void;
}

export function useEditorState({ initialData, onUpdate }: UseEditorStateProps) {
  const [activeSection, setActiveSection] = useState<'materials' | 'meshes' | 'variants' | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meshAssignments, setMeshAssignments] = useState<{[key: string]: MeshAssignment}>({});
  const [expandedMeshes, setExpandedMeshes] = useState<Set<string>>(new Set());
  const [isAutoSortEnabled, setIsAutoSortEnabled] = useState(
    initialData.sortSettings?.autoSortEnabled ?? false
  );

  // Initialize state from props
  useEffect(() => {
    setMaterials(initialData.materials || []);
    setMeshAssignments(initialData.meshAssignments || {});
  }, [initialData]);

  // Handle auto-sorting toggle
  const handleAutoSortToggle = useCallback((enabled: boolean) => {
    setIsAutoSortEnabled(enabled);
    
    const updatedData: MaterialData = {
      ...initialData,
      sortSettings: {
        ...(initialData.sortSettings || { tagStates: [], timestamp: Date.now() }),
        autoSortEnabled: enabled
      }
    };
    
    if (enabled && updatedData.sortSettings?.tagStates) {
      // Apply sorting if enabled
      const sortedMaterials = sortMaterialsByTagStates(
        materials,
        updatedData.sortSettings.tagStates
      );
      updatedData.materials = sortedMaterials;
      setMaterials(sortedMaterials);
    }
    
    onUpdate(updatedData);
  }, [initialData, materials, onUpdate]);

  // Handle material updates
  const updateMaterials = useCallback((updatedMaterials: Material[]) => {
    const sortedMaterials = isAutoSortEnabled && initialData.sortSettings?.tagStates
      ? sortMaterialsByTagStates(updatedMaterials, initialData.sortSettings.tagStates)
      : updatedMaterials;

    setMaterials(sortedMaterials);
    
    const updatedData: MaterialData = {
      ...initialData,
      materials: sortedMaterials,
      meshAssignments
    };
    onUpdate(updatedData);
  }, [initialData, meshAssignments, isAutoSortEnabled, onUpdate]);

  // Handle mesh assignment updates
  const updateMeshAssignments = useCallback((updatedAssignments: {[key: string]: MeshAssignment}) => {
    setMeshAssignments(updatedAssignments);
    
    const updatedData: MaterialData = {
      ...initialData,
      materials,
      meshAssignments: updatedAssignments
    };
    onUpdate(updatedData);
  }, [initialData, materials, onUpdate]);

  const toggleMeshExpansion = useCallback((meshName: string) => {
    setExpandedMeshes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meshName)) {
        newSet.delete(meshName);
      } else {
        newSet.add(meshName);
      }
      return newSet;
    });
  }, []);

  return {
    activeSection,
    setActiveSection,
    materials,
    meshAssignments,
    expandedMeshes,
    isAutoSortEnabled,
    updateMaterials,
    updateMeshAssignments,
    toggleMeshExpansion,
    handleAutoSortToggle,
  };
}

// Helper function to sort materials by tag states
function sortMaterialsByTagStates(materials: Material[], tagStates: any[]) {
  // Implementation of sorting logic...
  return materials;
}