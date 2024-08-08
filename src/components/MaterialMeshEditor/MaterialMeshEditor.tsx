// src/components/MaterialMeshEditor/MaterialMeshEditor.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InputDialog from '../InputDialog';
import MaterialsSection from './MaterialsSection';
import MeshAssignmentsSection from './MeshAssignmentsSection';
import { debounce } from 'lodash';

interface Material {
  name: string;
  tags: string[];
}

interface Variant {
  name: string;
  material: string;
}

interface MeshAssignment {
  defaultMaterial: string;
  variants: Variant[];
}

interface MaterialMeshEditorProps {
  data: any;
  onSave: (data: any) => void;
  onUpdate: (data: any) => void; // Add this line
}

const ITEMS_PER_PAGE = 5;

const MaterialMeshEditor: React.FC<MaterialMeshEditorProps> = ({ data, onSave, onUpdate }) => {
  const [editedData, setEditedData] = useState(data);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meshAssignments, setMeshAssignments] = useState<{[key: string]: MeshAssignment}>({});
  const [expandedMeshes, setExpandedMeshes] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [currentItemToRename, setCurrentItemToRename] = useState<string | null>(null);
  const [currentItemToTag, setCurrentItemToTag] = useState<string | null>(null);

  useEffect(() => {
    setEditedData(data);
  }, [data]);

  useEffect(() => {
    console.log('Data received:', data);
    try {
      setMaterials(data.materials || []);
      setMeshAssignments(data.meshAssignments || {});
      updateAllTags(data.materials || []);
    } catch (error) {
      console.error('Error setting initial state:', error);
    }
  }, [data]);

  const handleChange = (key: string, value: any) => {
    const updatedData = { ...editedData, [key]: value };
    setEditedData(updatedData);
    onUpdate(updatedData); // Immediately update parent component
  };

  const updateAllTags = useCallback((materials: Material[]) => {
    const tags = new Set<string>();
    materials.forEach(material => material.tags.forEach(tag => tags.add(tag)));
    setAllTags(Array.from(tags));
  }, []);

  const handleSectionClick = useCallback((section: string) => {
    setActiveSection(section);
  }, []);

  const handleAddMaterials = useCallback(() => {
    const input = prompt('Enter new materials (comma-separated):');
    if (input) {
      const newMaterials = input.split(',').map(m => m.trim()).filter(m => m);
      const tags = prompt('Enter tags for new materials (comma-separated):');
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        
        setMaterials(prevMaterials => {
          const updatedMaterials = prevMaterials.map(existingMaterial => {
            const matchingNewMaterial = newMaterials.find(m => m === existingMaterial.name);
            if (matchingNewMaterial) {
              return {
                ...existingMaterial,
                tags: [...existingMaterial.tags, ...tagList].filter((tag, index, self) => self.indexOf(tag) === index)
              };
            }
            return existingMaterial;
          });
  
          const brandNewMaterials = newMaterials.filter(m => !prevMaterials.some(existing => existing.name === m));
          updatedMaterials.push(...brandNewMaterials.map(m => ({ name: m, tags: tagList })));
  
          updateAllTags(updatedMaterials);
          return updatedMaterials;
        });
      }
    }
  }, [updateAllTags]);

  const handleRemoveMaterial = useCallback((materialName: string) => {
    setMaterials(prevMaterials => {
      const updatedMaterials = prevMaterials.filter(m => m.name !== materialName);
      updateAllTags(updatedMaterials);
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
  }, [updateAllTags]);

  const handleEditTags = useCallback((materialName: string) => {
    setCurrentItemToTag(materialName);
    setIsTagDialogOpen(true);
  }, []);

  const handleTagSubmit = useCallback((newTags: string) => {
    if (currentItemToTag) {
      const tagList = newTags.split(',').map(t => t.trim()).filter(t => t);
      setMaterials(prevMaterials => 
        prevMaterials.map(m => 
          m.name === currentItemToTag ? { ...m, tags: tagList } : m
        )
      );
      updateAllTags(materials);
    }
    setCurrentItemToTag(null);
  }, [currentItemToTag, materials, updateAllTags]);

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

  const handleAutoAssignTag = (meshName: string) => {
    const tag = prompt('Enter tag to auto-assign:');
    if (tag) {
      const taggedMaterials = materials.filter(m => m.tags.includes(tag));
      if (taggedMaterials.length > 0) {
        setMeshAssignments(prev => ({
          ...prev,
          [meshName]: {
            defaultMaterial: taggedMaterials[0].name,
            variants: taggedMaterials.map(m => ({ name: m.name, material: m.name }))
          }
        }));
      } else {
        alert('No materials found with the specified tag.');
      }
    }
  };

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

  const handleAssignmentChange = (meshName: string, field: 'defaultMaterial' | 'variants', value: string | undefined) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        [field]: value === undefined ? '' : value
      }
    }));
  };

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

  const handleVariantChange = (meshName: string, index: number, field: 'name' | 'material', value: string | undefined) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        variants: prev[meshName].variants.map((v, i) => i === index ? { ...v, [field]: value === undefined ? '' : value } : v)
      }
    }));
  };

  const handleRemoveVariant = (meshName: string, index: number) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        variants: prev[meshName].variants.filter((_, i) => i !== index)
      }
    }));
  };

  const handleAddVariant = (meshName: string) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        variants: [...prev[meshName].variants, { name: '', material: '' }]
      }
    }));
  };

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
    () => debounce(handleVariantChange, 300),
    [handleVariantChange]
  );

  const meshItems = Object.entries(meshAssignments);
  const totalPages = Math.ceil(meshItems.length / ITEMS_PER_PAGE);

  const handleSave = () => {
    const updatedData = {
      materials,
      meshAssignments
    };
    onSave(editedData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg text-gray-800">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Material and Mesh Editor</h3>
      <div className="flex space-x-4 mb-6">
        <Button
          onClick={() => setActiveSection('materials')}
          variant={activeSection === 'materials' ? "default" : "outline"}
          className="flex-1"
        >
          Materials
        </Button>
        <Button
          onClick={() => setActiveSection('meshes')}
          variant={activeSection === 'meshes' ? "default" : "outline"}
          className="flex-1"
        >
          Mesh Assignments
        </Button>
      </div>
      <Card>
        <CardContent>
          {activeSection === 'materials' && (
            <MaterialsSection
              materials={materials}
              onDragEnd={onDragEnd}
              onAddMaterials={handleAddMaterials}
              onSortMaterialsByName={handleSortMaterialsByName}
              onEditTags={handleEditTags}
              onRenameMaterial={(name) => {
                setCurrentItemToRename(name);
                setIsRenameDialogOpen(true);
              }}
              onRemoveMaterial={handleRemoveMaterial}
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
              onVariantChange={debouncedHandleVariantChange}
              onRemoveVariant={handleRemoveVariant}
              onAddVariant={handleAddVariant}
              onAddMesh={handleAddMesh}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
      <Button
        onClick={handleSave}
        className="mt-6 w-full"
      >
        Save Changes
      </Button>
      <InputDialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onSubmit={handleRenameSubmit}
        title={`Rename ${currentItemToRename ? 'Mesh' : 'Material'}`}
        initialValue={currentItemToRename || ''}
      />
      <InputDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSubmit={handleTagSubmit}
        title="Edit Tags"
        initialValue={currentItemToTag ? materials.find(m => m.name === currentItemToTag)?.tags.join(', ') || '' : ''}
      />
    </div>
  );
};

export default MaterialMeshEditor;