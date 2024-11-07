// src/components/MaterialMeshEditor/MeshAssignmentsSection.tsx

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import MeshItem from './MeshItem';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface MeshAssignmentsSectionProps {
  meshItems: [string, { defaultMaterial: string; variants: Array<{ name: string; material: string }> }][];
  materials: Array<{ name: string }>;
  expandedMeshes: Set<string>;
  onToggleMeshExpansion: (meshName: string) => void;
  onRenameMesh: (meshName: string) => void;
  onRemoveMesh: (meshName: string) => void;
  onAutoAssignTag: (meshName: string, tag: string) => void; // Updated signature
  onAssignmentChange: (meshName: string, field: "defaultMaterial" | "variants", value: string | undefined) => void;
  onVariantChange: (meshName: string, index: number, field: "name" | "material", value: string | undefined) => void;
  onRemoveVariant: (meshName: string, index: number) => void;
  onAddVariant: (meshName: string) => void;
  onAddMesh: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onDragEnd: (result: any) => void;
  onMoveMesh: (fromIndex: number, direction: 'up' | 'down') => void;
  canMove: (index: number, direction: 'up' | 'down') => boolean;
  totalItems: number;
  availableTags: string[]; 
}

const MeshAssignmentsSection: React.FC<MeshAssignmentsSectionProps> = ({
  meshItems,
  materials,
  expandedMeshes,
  onToggleMeshExpansion,
  onRenameMesh,
  onRemoveMesh,
  onAutoAssignTag,
  onAssignmentChange,
  onVariantChange,
  onRemoveVariant,
  onAddVariant,
  onAddMesh,
  currentPage,
  totalPages,
  onPageChange,
  onDragEnd,
  onMoveMesh,
  canMove,
  totalItems,
  availableTags
}) => {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                Mesh Assignments
              </CardTitle>
              <CardDescription>
                Configure material assignments for each mesh. The order of the meshes will later be reflected on the order of the material variants.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {meshItems.length} meshes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="meshes">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {meshItems.map(([meshName, assignment], index) => (
                    <Draggable 
                      key={meshName} 
                      draggableId={meshName} 
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <MeshItem
                            meshName={meshName}
                            assignment={assignment}
                            materials={materials}
                            expanded={expandedMeshes.has(meshName)}
                            onToggle={onToggleMeshExpansion}
                            onRename={onRenameMesh}
                            onRemove={onRemoveMesh}
                            onAutoAssign={onAutoAssignTag}
                            onAssignmentChange={onAssignmentChange}
                            onVariantChange={onVariantChange}
                            onRemoveVariant={onRemoveVariant}
                            onAddVariant={onAddVariant}
                            provided={provided}
                            index={index}
                            totalItems={totalItems}
                            onMove={onMoveMesh}
                            canMove={canMove}
                            availableTags={availableTags}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous page</TooltipContent>
              </Tooltip>

              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next page</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Add Mesh Button */}
          <Button
            onClick={onAddMesh}
            variant="outline"
            className="w-full mt-6 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Plus size={16} className="mr-2" /> 
            Add Mesh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeshAssignmentsSection;