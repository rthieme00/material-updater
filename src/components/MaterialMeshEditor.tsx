import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Move, SortAsc, Edit2, Zap, Tag } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface MaterialMeshEditorProps {
  data: any;
  onSave: (data: any) => void;
}

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

const MaterialMeshEditor: React.FC<MaterialMeshEditorProps> = ({ data, onSave }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [meshAssignments, setMeshAssignments] = useState<{[key: string]: MeshAssignment}>({});
  const [expandedMeshes, setExpandedMeshes] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    setMaterials(data.materials || []);
    setMeshAssignments(data.meshAssignments || {});
    updateAllTags(data.materials || []);
  }, [data]);

  const updateAllTags = (materials: Material[]) => {
    const tags = new Set<string>();
    materials.forEach(material => material.tags.forEach(tag => tags.add(tag)));
    setAllTags(Array.from(tags));
  };

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
  };

  const handleAddMaterials = () => {
    const input = prompt('Enter new materials (comma-separated):');
    if (input) {
      const newMaterials = input.split(',').map(m => m.trim()).filter(m => m);
      const tags = prompt('Enter tags for new materials (comma-separated):');
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        
        const updatedMaterials = materials.map(existingMaterial => {
          const matchingNewMaterial = newMaterials.find(m => m === existingMaterial.name);
          if (matchingNewMaterial) {
            // If the material already exists, add new tags to it
            return {
              ...existingMaterial,
              tags: [...existingMaterial.tags, ...tagList].filter((tag, index, self) => self.indexOf(tag) === index)
            };
          }
          return existingMaterial;
        });
  
        // Add completely new materials
        const brandNewMaterials = newMaterials.filter(m => !materials.some(existing => existing.name === m));
        updatedMaterials.push(...brandNewMaterials.map(m => ({ name: m, tags: tagList })));
  
        setMaterials(updatedMaterials);
        updateAllTags(updatedMaterials);
      }
    }
  };

  const handleRemoveMaterial = (materialName: string) => {
    const updatedMaterials = materials.filter(m => m.name !== materialName);
    setMaterials(updatedMaterials);
    updateAllTags(updatedMaterials);
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
  };

  const handleRenameMaterial = (oldName: string) => {
    const newName = prompt('Enter new material name:', oldName);
    if (newName && newName !== oldName && !materials.some(m => m.name === newName)) {
      const updatedMaterials = materials.map(m => m.name === oldName ? { ...m, name: newName } : m);
      setMaterials(updatedMaterials);
      setMeshAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(meshName => {
          if (newAssignments[meshName].defaultMaterial === oldName) {
            newAssignments[meshName].defaultMaterial = newName;
          }
          newAssignments[meshName].variants = newAssignments[meshName].variants.map(v => 
            v.material === oldName ? { ...v, material: newName } : v
          );
        });
        return newAssignments;
      });
    }
  };

  const handleEditTags = (materialName: string) => {
    const material = materials.find(m => m.name === materialName);
    if (material) {
      const currentTags = material.tags.join(', ');
      const newTags = prompt('Enter tags (comma-separated):', currentTags);
      if (newTags !== null) {
        const updatedMaterials = materials.map(m => 
          m.name === materialName ? { ...m, tags: newTags.split(',').map(t => t.trim()).filter(t => t) } : m
        );
        setMaterials(updatedMaterials);
        updateAllTags(updatedMaterials);
      }
    }
  };

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

  const handleRenameMesh = (oldName: string) => {
    const newName = prompt('Enter new mesh name:', oldName);
    if (newName && newName !== oldName && !meshAssignments[newName]) {
      setMeshAssignments(prev => {
        const newAssignments = { ...prev };
        newAssignments[newName] = newAssignments[oldName];
        delete newAssignments[oldName];
        return newAssignments;
      });
    }
  };

  const handleAssignmentChange = (meshName: string, field: 'defaultMaterial' | 'variants', value: string | Variant[]) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        [field]: value
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

  const handleVariantChange = (meshName: string, index: number, field: 'name' | 'material', value: string) => {
    setMeshAssignments(prev => ({
      ...prev,
      [meshName]: {
        ...prev[meshName],
        variants: prev[meshName].variants.map((v, i) => i === index ? { ...v, [field]: value } : v)
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

  const toggleMeshExpansion = (meshName: string) => {
    setExpandedMeshes(prev => {
      const newSet = new Set(prev);
      newSet.has(meshName) ? newSet.delete(meshName) : newSet.add(meshName);
      return newSet;
    });
  };

  const handleSave = () => {
    const updatedData = {
      materials,
      meshAssignments
    };
    onSave(updatedData);
  };

  const renderMaterials = () => (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="materials">
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef} className="list-none p-0">
            {materials.map((material, index) => (
              <Draggable key={material.name} draggableId={material.name} index={index}>
                {(provided) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="flex justify-between items-center p-3 bg-white mb-2 rounded shadow"
                  >
                    <div className="flex items-center">
                      <Move size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">{material.name}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="mr-4">
                        {material.tags.map(tag => (
                          <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleEditTags(material.name)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                        title="Edit Tags"
                      >
                        <Tag size={16} />
                      </button>
                      <button 
                        onClick={() => handleRenameMaterial(material.name)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                        title="Rename Material"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveMaterial(material.name)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove Material"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );

  const renderMeshAssignments = () => (
    <div>
      <h4 className="text-lg font-medium mb-2">Mesh Assignments:</h4>
      {Object.entries(meshAssignments).map(([meshName, assignment]) => (
        <div key={meshName} className="mb-4 p-4 border rounded">
          <div 
            className="flex justify-between items-center cursor-pointer" 
            onClick={() => toggleMeshExpansion(meshName)}
          >
            <h5 className="font-medium">{meshName}</h5>
            <div>
              <button onClick={(e) => { e.stopPropagation(); handleRenameMesh(meshName); }} className="mr-2 text-blue-500">Rename</button>
              <button onClick={(e) => { e.stopPropagation(); handleRemoveMesh(meshName); }} className="mr-2 text-red-500">Remove</button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAutoAssignTag(meshName); }} 
                className="mr-2 text-green-500"
                title="Auto-assign Tag"
              >
                <Zap size={16} />
              </button>
              {expandedMeshes.has(meshName) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </div>
          {expandedMeshes.has(meshName) && (
            <div className="mt-2">
              <div>
                <label className="block">Default Material:</label>
                <select
                  value={assignment.defaultMaterial}
                  onChange={(e) => handleAssignmentChange(meshName, 'defaultMaterial', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black"
                >
                  <option value="">Select a material</option>
                  {materials.map(material => (
                    <option key={material.name} value={material.name}>{material.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label className="block mb-2">Variant Materials:</label>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignment.variants.map((variant, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => handleVariantChange(meshName, index, 'name', e.target.value)}
                            placeholder="Variant name"
                            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={variant.material}
                            onChange={(e) => handleVariantChange(meshName, index, 'material', e.target.value)}
                            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black"
                          >
                            <option value="">Select a material</option>
                            {materials.map(material => (
                              <option key={material.name} value={material.name}>{material.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveVariant(meshName, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => handleAddVariant(meshName)}
                  className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                  <Plus size={16} className="inline mr-1" /> Add Variant
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleAddMesh}
        className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
      >
        Add Mesh
      </button>
    </div>
  );

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg text-gray-800">
        <h3 className="text-2xl font-bold mb-6 text-center text-blue-600">Material and Mesh Editor</h3>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => handleSectionClick('materials')}
            className={`flex-1 py-3 rounded-full transition-colors ${activeSection === 'materials' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Materials
          </button>
          <button
            onClick={() => handleSectionClick('meshes')}
            className={`flex-1 py-3 rounded-full transition-colors ${activeSection === 'meshes' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Mesh Assignments
          </button>
        </div>
        {activeSection === 'materials' && (
          <div>
            {renderMaterials()}
            <div className="mt-6 flex space-x-4">
              <button 
                onClick={handleAddMaterials}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full transition-colors"
              >
                Add Materials
              </button>
              <button
                onClick={handleSortMaterialsByName}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-full transition-colors"
              >
                Sort Materials by Name
              </button>
            </div>
          </div>
        )}
        {activeSection === 'meshes' && renderMeshAssignments()}
        <button
          onClick={handleSave}
          className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full transition-colors"
        >
          Save Changes
        </button>
      </div>
    );
  };
  
  export default MaterialMeshEditor;