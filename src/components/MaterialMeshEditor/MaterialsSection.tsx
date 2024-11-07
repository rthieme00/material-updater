// src/components/MaterialMeshEditor/MaterialsSection.tsx

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import MaterialItem from './MaterialItem';
import { Plus, ArrowUpDown } from 'lucide-react';
import { Material } from '@/gltf/gltfTypes';

interface MaterialsSectionProps {
  materials: Material[];
  onDragEnd: (result: any) => void;
  onAddMaterials: () => void;
  onSortMaterials: () => void;
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
  onMoveMaterial: (fromIndex: number, toIndex: number) => void;
}

const MaterialsSection: React.FC<MaterialsSectionProps> = ({
  materials,
  onDragEnd,
  onAddMaterials,
  onSortMaterials,
  onEditTags,
  onRenameMaterial,
  onRemoveMaterial,
  onMoveMaterial
}) => {
  const handleMoveMaterial = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < materials.length) {
      onMoveMaterial(index, newIndex);
    }
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="materials">
          {(provided) => (
            <ul 
              {...provided.droppableProps} 
              ref={provided.innerRef} 
              className="space-y-2 min-h-[200px] border rounded-lg p-4"
            >
              {materials.map((material, index) => (
                <Draggable key={material.name} draggableId={material.name} index={index}>
                  {(provided) => (
                    <MaterialItem
                      material={material}
                      index={index}
                      totalItems={materials.length}
                      onEditTags={onEditTags}
                      onRenameMaterial={onRenameMaterial}
                      onRemoveMaterial={onRemoveMaterial}
                      onMoveMaterial={handleMoveMaterial}
                      provided={provided}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex space-x-4">
        <Button 
          onClick={onAddMaterials}
          variant="outline"
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Materials
        </Button>
        <Button
          onClick={onSortMaterials}
          variant="outline"
          className="flex-1"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          Sort Materials
        </Button>
      </div>
    </div>
  );
};

export default MaterialsSection;