// src/components/MaterialMeshEditor/MaterialsSection.tsx

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import MaterialItem from './MaterialItem';

interface MaterialsSectionProps {
  materials: any[];
  onDragEnd: (result: any) => void;
  onAddMaterials: () => void;
  onSortMaterialsByName: () => void;
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
}

const MaterialsSection: React.FC<MaterialsSectionProps> = ({
  materials,
  onDragEnd,
  onAddMaterials,
  onSortMaterialsByName,
  onEditTags,
  onRenameMaterial,
  onRemoveMaterial
}) => {
  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="materials">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="list-none p-0">
              {materials.map((material, index) => (
                <Draggable key={material.name} draggableId={material.name} index={index}>
                  {(provided) => (
                    <MaterialItem
                      material={material}
                      onEditTags={onEditTags}
                      onRenameMaterial={onRenameMaterial}
                      onRemoveMaterial={onRemoveMaterial}
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
      <div className="mt-6 flex space-x-4">
        <Button 
          onClick={onAddMaterials}
          variant="outline"
          className="flex-1"
        >
          Add Materials
        </Button>
        <Button
          onClick={onSortMaterialsByName}
          variant="outline"
          className="flex-1"
        >
          Sort Materials by Name
        </Button>
      </div>
    </div>
  );
};

export default MaterialsSection;