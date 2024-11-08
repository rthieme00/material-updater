// src/components/MaterialMeshEditor/MaterialsSection.tsx

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import MaterialItem from './MaterialItem';
import { Plus } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Material } from '@/gltf/gltfTypes';

interface MaterialsSectionProps {
  materials: Material[];
  onDragEnd: (result: any) => void;
  onAddMaterials: () => void;
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
  onMoveMaterial: (index: number, direction: 'up' | 'down') => void; // Updated to match MaterialItem
  onRemoveTag: (materialName: string, tag: string) => void;
  isAutoSortEnabled: boolean;
}

const MaterialsSection: React.FC<MaterialsSectionProps> = ({
  materials,
  onDragEnd,
  onAddMaterials,
  onEditTags,
  onRenameMaterial,
  onRemoveMaterial,
  onMoveMaterial,
  onRemoveTag,
  isAutoSortEnabled
}) => {
  // Create a wrapper function to handle material movement
  const handleMoveMaterial = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < materials.length) {
      onMoveMaterial(index, direction);
    }
  };

  return (
    <Card className="p-6 bg-gray-50 dark:bg-gray-900 border-none shadow-none">
      <div className="space-y-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="materials" isDropDisabled={isAutoSortEnabled}>
            {(provided) => (
              <ul 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-3 min-h-[200px]"
              >
                {materials.map((material, index) => (
                  <Draggable 
                    key={material.name} 
                    draggableId={material.name} 
                    index={index}
                    isDragDisabled={isAutoSortEnabled}
                  >
                    {(provided) => (
                      <MaterialItem
                        material={material}
                        index={index}
                        totalItems={materials.length}
                        onEditTags={onEditTags}
                        onRenameMaterial={onRenameMaterial}
                        onRemoveMaterial={onRemoveMaterial}
                        onMoveMaterial={handleMoveMaterial}
                        onRemoveTag={onRemoveTag}
                        provided={provided}
                        isAutoSortEnabled={isAutoSortEnabled}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

        <Button 
          onClick={onAddMaterials}
          variant="outline"
          className="w-full bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Materials
        </Button>
      </div>
    </Card>
  );
};

export default MaterialsSection;