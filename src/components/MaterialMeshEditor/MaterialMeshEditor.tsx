// src/components/MaterialMeshEditor/MaterialMeshEditor.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InputDialog from '../Dialogs/InputDialog';
import MaterialsSection from './MaterialsSection';
import MeshAssignmentsSection from './MeshAssignmentsSection';
import MaterialSortDialog from '../Dialogs/MaterialSortDialog';
import DuplicateMaterialDialog from '../Dialogs/DuplicateMaterialDialog';
import { debounce } from 'lodash';
import { MaterialData, Material, MeshAssignment, Variant } from '@/gltf/gltfTypes'; // Import all types
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

  // Add new state for add material dialog
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

  const updateAllTags = useCallback((materials: Material[]) => {
    const tags = new Set<string>();
    materials.forEach(material => material.tags.forEach(tag => tags.add(tag)));
    setAllTags(Array.from(tags));
  }, []);
  
  useEffect(() => {
    try {
      setMaterials(data.materials || []);
      setMeshAssignments(data.meshAssignments || {});
      updateAllTags(data.materials || []);
    } catch (error) {
      console.error('Error setting initial state:', error);
    }
  }, [data, updateAllTags]);

  // Add safety check at the start of handlers
  const safeUpdate = useCallback((updatedData: MaterialData) => {
    if (typeof onUpdate === 'function') {
      onUpdate(updatedData);
    }
  }, [onUpdate]);

  // Make sure handleMaterialOrderChange is using the callback pattern
  const handleMaterialOrderChange = useCallback((result: any) => {
    if (!result.destination) return;

    setMaterials(prevMaterials => {
      const items = Array.from(prevMaterials);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Create updated data and sync with parent
      const updatedData: MaterialData = {
        ...data,
        materials: items
      };
      onUpdate(updatedData);

      return items;
    });
  }, [data, onUpdate]);

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

    // Check for duplicates
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
        const updatedMaterials = [...prevMaterials, ...newMaterials];
        const updatedData = {
          ...data,
          materials: updatedMaterials
        };
        safeUpdate(updatedData);
        updateAllTags(updatedMaterials);
        return updatedMaterials;
      });
    }

    setIsAddMaterialDialogOpen(false);
    setNewMaterialTags('');
  }, [materials, newMaterialTags, data, safeUpdate, updateAllTags]);

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

  const handleAddMaterials = useCallback(() => {
    const input = prompt('Enter new materials (comma-separated):');
    if (input) {
      const newMaterialNames = input.split(',').map(m => m.trim()).filter(m => m);
      const tags = prompt('Enter tags for new materials (comma-separated):');
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        
        const newMaterials = newMaterialNames.map(name => ({
          name,
          tags: tagList
        }));
  
        // Check for duplicates
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
          return;
        }
  
        setMaterials(prevMaterials => {
          const updatedMaterials = [...prevMaterials, ...newMaterials];
          updateAllTags(updatedMaterials);
          return updatedMaterials;
        });
      }
    }
  }, [materials, updateAllTags]);

  const handleDuplicateConfirm = useCallback((keepBoth: boolean) => {
    setIsDuplicateDialogOpen(false);
    
    if (keepBoth) {
      // Add numeric suffix to duplicate materials
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
      // Replace existing materials
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

  const handleSortMaterials = useCallback((sortedMaterials: Material[]) => {
    setMaterials(sortedMaterials);
    const updatedData = {
      ...data,
      materials: sortedMaterials
    };
    onUpdate(updatedData);
  }, [data, onUpdate]);

  const handleRemoveMaterial = useCallback((materialName: string) => {
    setMaterials(prevMaterials => {
      const updatedMaterials = prevMaterials.filter(m => m.name !== materialName);
      updateAllTags(updatedMaterials);

      const updatedData = {
        ...data,
        materials: updatedMaterials
      };
      onUpdate(updatedData);

      return updatedMaterials;
    });

    setMeshAssignments(prev => {
      const newAssignments = { ...prev };
      Object.keys(newAssignments).forEach(meshName => {
        if (newAssignments[meshName].defaultMaterial === materialName) {
          newAssignments[meshName].defaultMaterial = '';
        }
        newAssignments[meshName].variants = newAssignments[meshName].variants.filter(v => v.material !== materialName);
      });
      return newAssignments;
    });
  }, [data, onUpdate, updateAllTags]);

  const handleMoveMaterial = useCallback((fromIndex: number, toIndex: number) => {
    setMaterials(prevMaterials => {
      const newMaterials = [...prevMaterials];
      const [movedItem] = newMaterials.splice(fromIndex, 1);
      newMaterials.splice(toIndex, 0, movedItem);
      
      const updatedData: MaterialData = {
        ...data,
        materials: newMaterials
      };
      safeUpdate(updatedData);
      return newMaterials;
    });
  }, [data, safeUpdate]);

  const handleEditTags = useCallback((materialName: string) => {
    setCurrentItemToTag(materialName);
    setIsTagDialogOpen(true);
  }, []);

// Add this to the existing handleTagSubmit function:
const handleTagSubmit = useCallback((newTags: string) => {
  if (currentItemToTag) {
    // Allow empty tags by trimming and filtering empty strings
    const tagList = newTags.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0); // Only filter out completely empty tags

    setMaterials(prevMaterials => {
      const updatedMaterials = prevMaterials.map(m =>
        m.name === currentItemToTag ? { ...m, tags: tagList } : m
      );
      
      // Update all tags
      updateAllTags(updatedMaterials);
      
      // Update parent data
      const updatedData = {
        ...data,
        materials: updatedMaterials
      };
      onUpdate(updatedData);
      
      return updatedMaterials;
    });
  }
  setCurrentItemToTag(null);
  setIsTagDialogOpen(false);
}, [currentItemToTag, data, onUpdate, updateAllTags]);

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(materials);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMaterials(items);
  };

  const handleSortMaterialsByName = () => {
    setMaterials(prevMaterials => [...prevMaterials].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Update the auto-assign handler
  const handleAutoAssignTag = (meshName: string, selectedTag: string) => {
    const taggedMaterials = materials.filter(m => m.tags.includes(selectedTag));
    if (taggedMaterials.length > 0) {
      setMeshAssignments(prev => ({
        ...prev,
        [meshName]: {
          defaultMaterial: taggedMaterials[0].name,
          variants: taggedMaterials.map(m => ({ name: m.name, material: m.name }))
        }
      }));
    }
  };

    // Collect all unique tags
    const uniqueTags = useMemo(() => {
      const tags = new Set<string>();
      materials.forEach(material => {
        material.tags.forEach(tag => tags.add(tag));
      });
      return Array.from(tags).sort();
    }, [materials]);

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
          [field]: value || '' // Ensure we never set undefined
        }
      };

      const updatedData: MaterialData = {
        ...data,
        materials: materials,
        meshAssignments: newAssignments
      };
      
      console.log('Updating mesh assignment:', {
        meshName,
        field,
        value,
        newAssignments,
        updatedData
      });
      
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

  const handleRemoveMesh = (meshName: string) => {
    setMeshAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[meshName];
      return newAssignments;
    });
  };

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
      
      console.log('Updating variant:', {
        meshName,
        index,
        field,
        value,
        newAssignments,
        updatedData
      });

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

  // If using the debounced variant change, update it like this:
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

    // Prevent dragging outside current page
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

    // Update parent component
    const updatedData: MaterialData = {
      ...data,
      materials,
      meshAssignments: newAssignments
    };
    onUpdate(updatedData);
  }, [meshAssignments, materials, data, onUpdate, currentPage, ITEMS_PER_PAGE]);

  const handleMoveMesh = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const allItems = Object.entries(meshAssignments);
    const actualFromIndex = (currentPage - 1) * ITEMS_PER_PAGE + fromIndex;
    const actualToIndex = actualFromIndex + (direction === 'up' ? -1 : 1);
    
    if (actualToIndex < 0 || actualToIndex >= allItems.length) return;

    // If moving between pages, update the current page
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

    // Update parent component
    const updatedData: MaterialData = {
      ...data,
      materials,
      meshAssignments: newAssignments
    };
    onUpdate(updatedData);
  }, [meshAssignments, materials, data, onUpdate, currentPage, ITEMS_PER_PAGE, setCurrentPage]);

  // Helper function to determine if an item can move up/down
  const canMove = useCallback((index: number, direction: 'up' | 'down'): boolean => {
    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
    if (direction === 'up') {
      return actualIndex > 0;
    } else {
      return actualIndex < Object.keys(meshAssignments).length - 1;
    }
  }, [currentPage, ITEMS_PER_PAGE, meshAssignments]);

  

  // Add this new function to handle tag removal:
const handleRemoveTag = useCallback((materialName: string, tagToRemove: string) => {
  setMaterials(prevMaterials => {
    const updatedMaterials = prevMaterials.map(m =>
      m.name === materialName
        ? { ...m, tags: m.tags.filter(tag => tag !== tagToRemove) }
        : m
    );

    // Update all tags
    updateAllTags(updatedMaterials);

    // Update parent data
    const updatedData = {
      ...data,
      materials: updatedMaterials
    };
    onUpdate(updatedData);

    return updatedMaterials;
  });
}, [data, onUpdate, updateAllTags]);

  const handleSave = () => {
    const updatedData = {
      materials,
      meshAssignments
    };
    onSave(updatedData);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Top Actions Bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        {/* Section Tabs */}
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {activeSection === 'materials' && (
            <>
              <Button 
                onClick={() => setIsSortDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                Sort Materials
              </Button>
              {data.materials.length > 0 && (
                <Button 
                  onClick={handleSave}
                  size="sm"
                >
                  Save
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Area with ScrollArea */}
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
              onRemoveTag={handleRemoveTag}  // Add this line
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
              onAutoAssignTag={handleAutoAssignTag}
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

      {/* Add Material Dialog */}
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
      />

      <DuplicateMaterialDialog
        isOpen={isDuplicateDialogOpen}
        onClose={() => setIsDuplicateDialogOpen(false)}
        onConfirm={(keepBoth) => handleDuplicateConfirm(keepBoth)}
        duplicateMaterials={duplicateMaterials}
      />

      <InputDialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onSubmit={handleRenameSubmit}
        title={`Rename ${currentItemToRename ? 'Material' : 'Mesh'}`}
        initialValue={currentItemToRename || ''}
      />

      <InputDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSubmit={handleTagSubmit}
        title="Edit Tags"
        initialValue={currentItemToTag ? materials.find(m => m.name === currentItemToTag)?.tags.join(', ') || '' : ''}
      />
      
      {/* Add Mesh Dialog */}
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