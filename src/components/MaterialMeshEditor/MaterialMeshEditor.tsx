// src/components/MaterialMeshEditor/MaterialMeshEditor.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import InputDialog from '../Dialogs/InputDialog';
import MaterialsSection from './MaterialsSection';
import MeshAssignmentsSection from './MeshAssignmentsSection';
import MaterialSortDialog from '../Dialogs/MaterialSortDialog';
import DuplicateMaterialDialog from '../Dialogs/DuplicateMaterialDialog';
import { debounce } from 'lodash';
import { MaterialData, Material, MeshAssignment, Variant, TagSortState } from '@/gltf/gltfTypes';
import { ScrollArea } from '../ui/scroll-area';
import PreviewVariantsSection from './PreviewVariantsSection';

interface MaterialMeshEditorProps {
  data: MaterialData;
  onSave: (data: MaterialData) => void;
  onUpdate: (data: MaterialData) => void;
}

const ITEMS_PER_PAGE = 7;

const MaterialMeshEditor: React.FC<MaterialMeshEditorProps> = ({ 
  data, 
  onSave,
  onUpdate
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meshAssignments, setMeshAssignments] = useState<{[key: string]: MeshAssignment}>({});
  const [expandedMeshes, setExpandedMeshes] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAutoSortEnabled, setIsAutoSortEnabled] = useState(
    data.sortSettings?.autoSortEnabled ?? false
  );

  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
  const [isAddMeshDialogOpen, setIsAddMeshDialogOpen] = useState(false);
  const [newMaterialTags, setNewMaterialTags] = useState<string>('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [currentItemToRename, setCurrentItemToRename] = useState<string | null>(null);
  const [currentItemToTag, setCurrentItemToTag] = useState<string | null>(null);
  const [duplicateMaterials, setDuplicateMaterials] = useState<Array<{
    name: string;
    existingTags: string[];
    newTags: string[];
  }>>([]);

  const safeUpdate = useCallback((updatedData: MaterialData) => {
    if (onUpdate) {
      onUpdate(updatedData);
    }
  }, [onUpdate]);

  const autoTagAssignments = useMemo(() => {
    return Object.entries(meshAssignments).filter(([_, assignment]) => 
      assignment.autoTag?.enabled && assignment.autoTag.tag
    );
  }, [meshAssignments]);

  const updateAllTags = useCallback((materials: Material[]) => {
    const tags = new Set<string>();
    materials.forEach(material => material.tags.forEach(tag => tags.add(tag)));
    setAllTags(Array.from(tags));
  }, []);

  // Remove the auto-loading from localStorage in this useEffect
  useEffect(() => {
    try {
      if (data) {  // Only set state if data is provided
        setMaterials(data.materials || []);
        setMeshAssignments(data.meshAssignments || {});
        updateAllTags(data.materials || []);
        setIsAutoSortEnabled(data.sortSettings?.autoSortEnabled ?? false);
      } else {
        // If no data, ensure clean state
        setMaterials([]);
        setMeshAssignments({});
        setAllTags([]);
        setIsAutoSortEnabled(false);
        setActiveSection(null);
        setExpandedMeshes(new Set());
      }
    } catch (error) {
      console.error('Error setting initial state:', error);
    }
  }, [data, updateAllTags]);

  // Modified autoTagChange handler to prevent infinite loops
  const handleAutoTagChange = useCallback((meshName: string, enabled: boolean, tag?: string) => {
    setMeshAssignments(prev => {
      const currentAssignment = prev[meshName];
      
      // Create new assignment object
      const newAssignment = {
        ...currentAssignment,
        autoTag: enabled ? { 
          enabled, 
          tag: tag || currentAssignment?.autoTag?.tag || '' 
        } : undefined
      };

      // Only update variants if auto-tag is enabled and tag is provided
      if (enabled && tag) {
        const taggedMaterials = materials.filter(m => m.tags.includes(tag));
        if (taggedMaterials.length > 0) {
          newAssignment.variants = taggedMaterials.map(m => ({ 
            name: m.name, 
            material: m.name 
          }));
        }
      }

      const newAssignments = {
        ...prev,
        [meshName]: newAssignment
      };

      // Batch the update to prevent multiple re-renders
      const updatedData = {
        ...data,
        materials,
        meshAssignments: newAssignments
      };
      
      // Use requestAnimationFrame to batch the update
      requestAnimationFrame(() => {
        safeUpdate(updatedData);
      });

      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

  // Modified effect to handle auto-tag updates more efficiently
  useEffect(() => {
    if (!materials.length) return;

    const autoTaggedMeshes = autoTagAssignments.filter(([_, assignment]) => 
      assignment.autoTag?.enabled && assignment.autoTag.tag
    );

    if (autoTaggedMeshes.length === 0) return;

    const updates: { [key: string]: typeof meshAssignments[string] } = {};
    let hasChanges = false;

    autoTaggedMeshes.forEach(([meshName, assignment]) => {
      const tag = assignment.autoTag?.tag;
      if (!tag) return;

      const taggedMaterials = materials.filter(m => m.tags.includes(tag));
      if (taggedMaterials.length === 0) return;

      const newVariants = taggedMaterials.map(m => ({ 
        name: m.name, 
        material: m.name 
      }));

      if (JSON.stringify(assignment.variants) !== JSON.stringify(newVariants)) {
        hasChanges = true;
        updates[meshName] = {
          ...assignment,
          variants: newVariants
        };
      }
    });

    if (hasChanges) {
      setMeshAssignments(prev => ({
        ...prev,
        ...updates
      }));

      const updatedData = {
        ...data,
        materials,
        meshAssignments: {
          ...meshAssignments,
          ...updates
        }
      };

      // Batch update using requestAnimationFrame
      requestAnimationFrame(() => {
        safeUpdate(updatedData);
      });
    }
  }, [materials, autoTagAssignments, data, safeUpdate]);

  useEffect(() => {
    try {
      setMaterials(data.materials || []);
      setMeshAssignments(data.meshAssignments || {});
      updateAllTags(data.materials || []);
    } catch (error) {
      console.error('Error setting initial state:', error);
    }
  }, [data, updateAllTags]);

  useEffect(() => {
    setIsAutoSortEnabled(data.sortSettings?.autoSortEnabled ?? false);
  }, [data.sortSettings?.autoSortEnabled]);

  const sortMaterialsByCurrentSettings = useCallback((materialsToSort: Material[]) => {
    if (!data.sortSettings?.tagStates) return materialsToSort;

    const enabledTags = data.sortSettings.tagStates
      .filter(tag => tag.enabled)
      .sort((a, b) => a.order - b.order)
      .map(tag => tag.name);

    const isUntaggedEnabled = data.sortSettings.tagStates
      .find(t => t.name === 'Untagged')?.enabled ?? true;

    const materialGroups = new Map<string, Material[]>();
    enabledTags.forEach(tag => materialGroups.set(tag, []));
    materialGroups.set('untagged', []);
    materialGroups.set('remaining', []);

    materialsToSort.forEach(material => {
      if (material.tags.length === 0) {
        materialGroups.get('untagged')?.push(material);
        return;
      }

      let assigned = false;
      for (const tag of enabledTags) {
        if (material.tags.includes(tag)) {
          materialGroups.get(tag)?.push(material);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        materialGroups.get('remaining')?.push(material);
      }
    });

    enabledTags.forEach(tag => {
      const group = materialGroups.get(tag);
      if (group) {
        materialGroups.set(tag, group.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });

    if (isUntaggedEnabled) {
      const untaggedGroup = materialGroups.get('untagged');
      if (untaggedGroup) {
        materialGroups.set('untagged', untaggedGroup.sort((a, b) => a.name.localeCompare(b.name)));
      }
    }

    const sortedMaterials: Material[] = [];
    enabledTags.forEach(tag => {
      sortedMaterials.push(...(materialGroups.get(tag) || []));
    });
    if (isUntaggedEnabled) {
      sortedMaterials.push(...(materialGroups.get('untagged') || []));
    }
    sortedMaterials.push(...(materialGroups.get('remaining') || []));

    return sortedMaterials;
  }, [data.sortSettings?.tagStates]);

  const handleMaterialOrderChange = useCallback((result: any) => {
    if (!result.destination) return;

    setMaterials(prevMaterials => {
      const items = Array.from(prevMaterials);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      const finalMaterials = isAutoSortEnabled 
        ? sortMaterialsByCurrentSettings(items)
        : items;

      const updatedData = {
        ...data,
        materials: finalMaterials
      };
      onUpdate(updatedData);

      return finalMaterials;
    });
  }, [data, isAutoSortEnabled, sortMaterialsByCurrentSettings, onUpdate]);

  const handleAddMaterialsClick = useCallback(() => {
    setIsAddMaterialDialogOpen(true);
  }, []);

  const handleAddMeshClick = useCallback(() => {
    setIsAddMeshDialogOpen(true);
  }, []);

  const handleAddMaterialSubmit = useCallback((materialNames: string) => {
    const newMaterialNames = materialNames.split(',').map(m => m.trim()).filter(m => m);
    
    const newMaterials = newMaterialNames.map(name => ({
      name,
      tags: newMaterialTags.split(',').map(t => t.trim()).filter(t => t)
    }));

    const duplicates = newMaterials.filter(newMat => 
      materials.some(existingMat => existingMat.name === newMat.name)
    ).map(dupMat => ({
      name: dupMat.name,
      existingTags: materials.find(m => m.name === dupMat.name)?.tags || [],
      newTags: dupMat.tags
    }));

    if (duplicates.length > 0) {
      setDuplicateMaterials(duplicates);
      setIsDuplicateDialogOpen(true);
    } else {
      setMaterials(prevMaterials => {
        const combinedMaterials = [...prevMaterials, ...newMaterials];
        const sortedMaterials = isAutoSortEnabled 
          ? sortMaterialsByCurrentSettings(combinedMaterials)
          : combinedMaterials;

        const updatedData = {
          ...data,
          materials: sortedMaterials
        };
        safeUpdate(updatedData);
        updateAllTags(sortedMaterials);
        return sortedMaterials;
      });
    }

    setIsAddMaterialDialogOpen(false);
    setNewMaterialTags('');
  }, [materials, newMaterialTags, data, safeUpdate, updateAllTags, isAutoSortEnabled, sortMaterialsByCurrentSettings]);

  const handleAddMeshSubmit = useCallback((meshName: string) => {
    if (meshName && !meshAssignments[meshName]) {
      setMeshAssignments(prev => {
        const newAssignments = {
          ...prev,
          [meshName]: { defaultMaterial: '', variants: [] }
        };

        const updatedData = {
          ...data,
          materials,
          meshAssignments: newAssignments
        };
        safeUpdate(updatedData);

        return newAssignments;
      });
    }
    setIsAddMeshDialogOpen(false);
  }, [meshAssignments, data, materials, safeUpdate]);

  const handleDuplicateConfirm = useCallback((keepBoth: boolean) => {
    setIsDuplicateDialogOpen(false);
    
    if (keepBoth) {
      const newMaterials = duplicateMaterials.map(dupMat => ({
        name: `${dupMat.name}_1`,
        tags: dupMat.newTags
      }));
      
      setMaterials(prev => {
        const updated = [...prev, ...newMaterials];
        updateAllTags(updated);
        return updated;
      });
    } else {
      setMaterials(prev => {
        const updated = prev.map(material => {
          const duplicate = duplicateMaterials.find(dup => dup.name === material.name);
          if (duplicate) {
            return {
              ...material,
              tags: duplicate.newTags
            };
          }
          return material;
        });
        updateAllTags(updated);
        return updated;
      });
    }
  }, [duplicateMaterials, updateAllTags]);

  const handleSortMaterials = useCallback((sortedMaterials: Material[], sortSettings: TagSortState[]) => {
    const updatedData: MaterialData = {
      ...data,
      materials: sortedMaterials,
      sortSettings: {
        tagStates: sortSettings,
        timestamp: Date.now(),
        autoSortEnabled: isAutoSortEnabled
      }
    };
    
    onUpdate(updatedData);
    setMaterials(sortedMaterials);
  }, [data, isAutoSortEnabled, onUpdate]);

  const updateMaterialsWithSort = useCallback((updatedMaterials: Material[]) => {
    const finalMaterials = isAutoSortEnabled && data.sortSettings?.tagStates
      ? sortMaterialsByCurrentSettings(updatedMaterials)
      : updatedMaterials;

    setMaterials(finalMaterials);
    const updatedData = {
      ...data,
      materials: finalMaterials
    };
    onUpdate(updatedData);
  }, [data, onUpdate, isAutoSortEnabled, sortMaterialsByCurrentSettings]);

  const handleRemoveMaterial = useCallback((materialName: string) => {
    setMaterials(prevMaterials => {
      const filteredMaterials = prevMaterials.filter(m => m.name !== materialName);
      updateMaterialsWithSort(filteredMaterials);
      updateAllTags(filteredMaterials);
      return filteredMaterials;
    });

    setMeshAssignments(prev => {
      const newAssignments = { ...prev };
      Object.keys(newAssignments).forEach(meshName => {
        if (newAssignments[meshName].defaultMaterial === materialName) {
          newAssignments[meshName].defaultMaterial = '';
        }
        newAssignments[meshName].variants = newAssignments[meshName].variants
          .filter(v => v.material !== materialName);
      });
      return newAssignments;
    });
  }, [updateMaterialsWithSort, updateAllTags]);

  const handleMoveMaterial = useCallback((index: number, direction: 'up' | 'down') => {
    setMaterials(prevMaterials => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= prevMaterials.length) {
        return prevMaterials;
      }
      
      const newMaterials = [...prevMaterials];
      const [movedItem] = newMaterials.splice(index, 1);
      newMaterials.splice(newIndex, 0, movedItem);
      
      const finalMaterials = isAutoSortEnabled 
        ? sortMaterialsByCurrentSettings(newMaterials)
        : newMaterials;
      
      const updatedData: MaterialData = {
        ...data,
        materials: finalMaterials
      };
      safeUpdate(updatedData);
      
      return finalMaterials;
    });
  }, [data, safeUpdate, isAutoSortEnabled, sortMaterialsByCurrentSettings]);

  const handleEditTags = useCallback((materialName: string) => {
    setCurrentItemToTag(materialName);
    setIsTagDialogOpen(true);
  }, []);

  const handleTagSubmit = useCallback((newTags: string) => {
    if (currentItemToTag) {
      const tagList = newTags.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      setMaterials(prevMaterials => {
        const updatedMaterials = prevMaterials.map(m =>
          m.name === currentItemToTag ? { ...m, tags: tagList } : m
        );
        
        updateAllTags(updatedMaterials);
        updateMaterialsWithSort(updatedMaterials);
        return updatedMaterials;
      });
    }
    setCurrentItemToTag(null);
    setIsTagDialogOpen(false);
  }, [currentItemToTag, updateMaterialsWithSort, updateAllTags]);

  const handleAutoSortToggle = useCallback((enabled: boolean) => {
    setIsAutoSortEnabled(enabled);
    
    const updatedData: MaterialData = {
      ...data,
      sortSettings: {
        ...(data.sortSettings || { tagStates: [], timestamp: Date.now() }),
        autoSortEnabled: enabled
      }
    };
    
    if (enabled && updatedData.sortSettings?.tagStates) {
      updatedData.materials = sortMaterialsByCurrentSettings([...materials]);
    }
    
    onUpdate(updatedData);
  }, [data, materials, sortMaterialsByCurrentSettings, onUpdate]);

  const handleAutoAssignTag = useCallback((meshName: string, selectedTag: string) => {
    const taggedMaterials = materials.filter(m => m.tags.includes(selectedTag));
    if (taggedMaterials.length > 0) {
      setMeshAssignments(prev => ({
        ...prev,
        [meshName]: {
          ...prev[meshName],
          defaultMaterial: taggedMaterials[0].name,
          variants: taggedMaterials.map(m => ({ name: m.name, material: m.name }))
        }
      }));
    }
  }, [materials]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    materials.forEach(material => {
      material.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [materials]);

  const handleRenameMaterial = useCallback((materialName: string) => {
    setCurrentItemToRename(materialName);
    setIsRenameDialogOpen(true);
  }, []);

  const handleRenameMaterialSubmit = useCallback((newName: string) => {
    if (currentItemToRename && newName && newName !== currentItemToRename) {
      setMaterials(prevMaterials => {
        const updatedMaterials = prevMaterials.map(m =>
          m.name === currentItemToRename ? { ...m, name: newName } : m
        );
        
        const sortedMaterials = isAutoSortEnabled 
          ? sortMaterialsByCurrentSettings(updatedMaterials)
          : updatedMaterials;

        const newMeshAssignments = { ...meshAssignments };
        Object.keys(newMeshAssignments).forEach(meshName => {
          const assignment = newMeshAssignments[meshName];
          if (assignment.defaultMaterial === currentItemToRename) {
            assignment.defaultMaterial = newName;
          }
          assignment.variants = assignment.variants.map(variant => ({
            ...variant,
            material: variant.material === currentItemToRename ? newName : variant.material
          }));
        });
        setMeshAssignments(newMeshAssignments);

        const updatedData: MaterialData = {
          ...data,
          materials: sortedMaterials,
          meshAssignments: newMeshAssignments
        };
        onUpdate(updatedData);

        return sortedMaterials;
      });
    }
    setCurrentItemToRename(null);
    setIsRenameDialogOpen(false);
  }, [currentItemToRename, isAutoSortEnabled, sortMaterialsByCurrentSettings, meshAssignments, data, onUpdate]);

  const handleRenameMesh = useCallback((meshName: string) => {
    setCurrentItemToRename(meshName);
    setIsRenameDialogOpen(true);
  }, []);

  const handleRenameSubmit = useCallback((newName: string) => {
    if (currentItemToRename && newName && newName !== currentItemToRename) {
      setMeshAssignments(prev => {
        const newAssignments = { ...prev };
        newAssignments[newName] = newAssignments[currentItemToRename];
        delete newAssignments[currentItemToRename];
        return newAssignments;
      });
    }
    setCurrentItemToRename(null);
  }, [currentItemToRename]);

  const handleAssignmentChange = useCallback((meshName: string, field: "defaultMaterial" | "variants", value: string | undefined) => {
    setMeshAssignments(prev => {
      const newAssignments = {
        ...prev,
        [meshName]: {
          ...prev[meshName],
          [field]: value || ''
        }
      };

      const updatedData: MaterialData = {
        ...data,
        materials: materials,
        meshAssignments: newAssignments
      };
      
      safeUpdate(updatedData);
      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

  const handleAddMesh = () => {
    const newMeshName = prompt('Enter new mesh name:');
    if (newMeshName && !meshAssignments[newMeshName]) {
      setMeshAssignments(prev => ({
        ...prev,
        [newMeshName]: { defaultMaterial: '', variants: [] }
      }));
    }
  };

  const handleRemoveMesh = useCallback((meshName: string) => {
    setMeshAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[meshName];

      const updatedData = {
        ...data,
        materials,
        meshAssignments: newAssignments
      };
      safeUpdate(updatedData);

      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

  const handleVariantChange = useCallback((meshName: string, index: number, field: "name" | "material", value: string | undefined) => {
    setMeshAssignments(prev => {
      const newAssignments = {
        ...prev,
        [meshName]: {
          ...prev[meshName],
          variants: prev[meshName].variants.map((v, i) => 
            i === index ? { ...v, [field]: value || '' } : v
          )
        }
      };

      const updatedData: MaterialData = {
        ...data,
        materials: materials,
        meshAssignments: newAssignments
      };

      safeUpdate(updatedData);
      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

  const handleRemoveVariant = useCallback((meshName: string, index: number) => {
    setMeshAssignments(prev => {
      const newAssignments = {
        ...prev,
        [meshName]: {
          ...prev[meshName],
          variants: prev[meshName].variants.filter((_, i) => i !== index)
        }
      };

      const updatedData: MaterialData = {
        ...data,
        materials: materials,
        meshAssignments: newAssignments
      };

      safeUpdate(updatedData);
      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

  const handleAddVariant = useCallback((meshName: string) => {
    setMeshAssignments(prev => {
      const newAssignments = {
        ...prev,
        [meshName]: {
          ...prev[meshName],
          variants: [...prev[meshName].variants, { name: '', material: '' }]
        }
      };

      const updatedData: MaterialData = {
        ...data,
        materials: materials,
        meshAssignments: newAssignments
      };

      safeUpdate(updatedData);
      return newAssignments;
    });
  }, [data, materials, safeUpdate]);

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

  const debouncedHandleVariantChange = useMemo(
    () => debounce((meshName: string, index: number, field: "name" | "material", value: string | undefined) => {
      handleVariantChange(meshName, index, field, value);
    }, 300),
    [handleVariantChange]
  );

  const meshItems = Object.entries(meshAssignments);
  const totalPages = Math.ceil(meshItems.length / ITEMS_PER_PAGE);

  const handleMeshOrderChange = useCallback((result: any) => {
    if (!result.destination) return;

    const allItems = Object.entries(meshAssignments);
    const sourceIndex = (currentPage - 1) * ITEMS_PER_PAGE + result.source.index;
    const destinationIndex = (currentPage - 1) * ITEMS_PER_PAGE + result.destination.index;

    if (Math.floor(sourceIndex / ITEMS_PER_PAGE) !== Math.floor(destinationIndex / ITEMS_PER_PAGE)) {
      return;
    }

    const [reorderedItem] = allItems.splice(sourceIndex, 1);
    allItems.splice(destinationIndex, 0, reorderedItem);

    const newAssignments = allItems.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as typeof meshAssignments);

    setMeshAssignments(newAssignments);

    const updatedData: MaterialData = {
      ...data,
      materials,
      meshAssignments: newAssignments
    };
    onUpdate(updatedData);
  }, [meshAssignments, materials, data, onUpdate, currentPage]);

  const handleMoveMesh = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const allItems = Object.entries(meshAssignments);
    const actualFromIndex = (currentPage - 1) * ITEMS_PER_PAGE + fromIndex;
    const actualToIndex = actualFromIndex + (direction === 'up' ? -1 : 1);
    
    if (actualToIndex < 0 || actualToIndex >= allItems.length) return;

    const newPage = Math.floor(actualToIndex / ITEMS_PER_PAGE) + 1;
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }

    [allItems[actualFromIndex], allItems[actualToIndex]] = 
    [allItems[actualToIndex], allItems[actualFromIndex]];
    
    const newAssignments = allItems.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as typeof meshAssignments);

    setMeshAssignments(newAssignments);

    const updatedData: MaterialData = {
      ...data,
      materials,
      meshAssignments: newAssignments
    };
    onUpdate(updatedData);
  }, [meshAssignments, materials, data, onUpdate, currentPage]);

  const canMove = useCallback((index: number, direction: 'up' | 'down'): boolean => {
    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
    if (direction === 'up') {
      return actualIndex > 0;
    } else {
      return actualIndex < Object.keys(meshAssignments).length - 1;
    }
  }, [currentPage, meshAssignments]);

  const handleRemoveTag = useCallback((materialName: string, tagToRemove: string) => {
    setMaterials(prevMaterials => {
      const updatedMaterials = prevMaterials.map(m =>
        m.name === materialName
          ? { ...m, tags: m.tags.filter(tag => tag !== tagToRemove) }
          : m
      );

      const sortedMaterials = isAutoSortEnabled 
        ? sortMaterialsByCurrentSettings(updatedMaterials)
        : updatedMaterials;

      updateAllTags(sortedMaterials);

      const updatedData = {
        ...data,
        materials: sortedMaterials,
        sortSettings: {
          ...(data.sortSettings || { tagStates: [], timestamp: Date.now() }),
          autoSortEnabled: isAutoSortEnabled
        }
      };
      onUpdate(updatedData);

      return sortedMaterials;
    });
  }, [data, onUpdate, updateAllTags, isAutoSortEnabled, sortMaterialsByCurrentSettings]);

  const handleSave = useCallback((updatedData: MaterialData) => {
    if (onSave) {
      onSave(updatedData);
    }
  }, [onSave]);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveSection('materials')}
            variant={activeSection === 'materials' ? "default" : "outline"}
            size="sm"
            className="w-32"
          >
            Materials
          </Button>
          <Button
            onClick={() => setActiveSection('meshes')}
            variant={activeSection === 'meshes' ? "default" : "outline"}
            size="sm"
            className="w-32"
          >
            Mesh Assignments
          </Button>
          <Button
            onClick={() => setActiveSection('variants')}
            variant={activeSection === 'variants' ? "default" : "outline"}
            size="sm"
            className="w-32"
          >
            Preview Variants
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {activeSection === 'materials' && (
            <>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Switch
                      checked={isAutoSortEnabled}
                      onCheckedChange={handleAutoSortToggle}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-sort materials based on tag settings
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm text-gray-500">Auto-sort</span>
              </div>
              <Button 
                onClick={() => setIsSortDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                Sort Materials
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-12rem)] pr-4">
        <div className="h-full">
          {activeSection === 'materials' && (
            <MaterialsSection
              materials={materials}
              onDragEnd={handleMaterialOrderChange}
              onAddMaterials={handleAddMaterialsClick}
              onEditTags={handleEditTags}
              onRenameMaterial={(name) => {
                setCurrentItemToRename(name);
                setIsRenameDialogOpen(true);
              }}
              onRemoveMaterial={handleRemoveMaterial}
              onMoveMaterial={handleMoveMaterial}
              onRemoveTag={handleRemoveTag}
              isAutoSortEnabled={isAutoSortEnabled}
            />
          )}
          {activeSection === 'meshes' && (
            <MeshAssignmentsSection
              meshItems={meshItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
              materials={materials}
              expandedMeshes={expandedMeshes}
              onToggleMeshExpansion={toggleMeshExpansion}
              onRenameMesh={handleRenameMesh}
              onRemoveMesh={handleRemoveMesh}
              onAutoAssignTag={handleAutoAssignTag}
              onAssignmentChange={handleAssignmentChange}
              onVariantChange={handleVariantChange}
              onRemoveVariant={handleRemoveVariant}
              onAddVariant={handleAddVariant}
              onAddMesh={handleAddMeshClick}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onDragEnd={handleMeshOrderChange}
              onMoveMesh={handleMoveMesh}
              canMove={canMove}
              totalItems={Object.keys(meshAssignments).length}
              availableTags={uniqueTags}
              onAutoTagChange={handleAutoTagChange}
            />
          )}
          {activeSection === 'variants' && (
            <PreviewVariantsSection
              meshAssignments={meshAssignments}
              materials={materials}
            />
          )}
        </div>
      </ScrollArea>

      <InputDialog
        isOpen={isAddMaterialDialogOpen}
        onClose={() => setIsAddMaterialDialogOpen(false)}
        onSubmit={handleAddMaterialSubmit}
        title="Add Materials"
        description="Enter material names (comma-separated)"
      />

      <MaterialSortDialog
        isOpen={isSortDialogOpen}
        onClose={() => setIsSortDialogOpen(false)}
        materials={materials}
        onApplySort={handleSortMaterials}
        currentData={data}
      />

      <DuplicateMaterialDialog
        isOpen={isDuplicateDialogOpen}
        onClose={() => setIsDuplicateDialogOpen(false)}
        onConfirm={handleDuplicateConfirm}
        duplicateMaterials={duplicateMaterials}
      />

      <InputDialog
        isOpen={isRenameDialogOpen}
        onClose={() => {
          setIsRenameDialogOpen(false);
          setCurrentItemToRename(null);
        }}
        onSubmit={handleRenameMaterialSubmit}
        title={`Rename ${currentItemToRename ? 'Material' : 'Mesh'}`}
        initialValue={currentItemToRename || ''}
      />
      
      <InputDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSubmit={handleTagSubmit}
        title="Edit Tags"
        initialValue={currentItemToTag ? materials.find(m => m.name === currentItemToTag)?.tags.join(', ') || '' : ''}
        type="tags"
        placeholder="Add tags"
      />

      <InputDialog
        isOpen={isAddMeshDialogOpen}
        onClose={() => setIsAddMeshDialogOpen(false)}
        onSubmit={handleAddMeshSubmit}
        title="Add Mesh"
        description="Enter mesh name"
      />
    </div>
  );
};

export default MaterialMeshEditor;