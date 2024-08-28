// src/components/MaterialMeshEditor/MeshAssignmentsSection.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import MeshItem from './MeshItem';
import { Plus } from 'lucide-react';

interface MeshAssignmentsSectionProps {
  meshItems: [string, { defaultMaterial: string; variants: Array<{ name: string; material: string }> }][];
  materials: Array<{ name: string }>;
  expandedMeshes: Set<string>;
  onToggleMeshExpansion: (meshName: string) => void;
  onRenameMesh: (meshName: string) => void;
  onRemoveMesh: (meshName: string) => void;
  onAutoAssignTag: (meshName: string) => void;
  onAssignmentChange: (meshName: string, field: "defaultMaterial" | "variants", value: string | undefined) => void;
  onVariantChange: (meshName: string, index: number, field: "name" | "material", value: string | undefined) => void;
  onRemoveVariant: (meshName: string, index: number) => void;
  onAddVariant: (meshName: string) => void;
  onAddMesh: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
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
  onPageChange
}) => {
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium mb-2">Mesh Assignments:</h4>
      {meshItems.map(([meshName, assignment]) => (
        <MeshItem
          key={meshName}
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
        />
      ))}
      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span>{currentPage} / {totalPages}</span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <Button
        onClick={onAddMesh}
        variant="outline"
        className="mt-4 w-full"
      >
        <Plus size={16} className="mr-1" /> Add Mesh
      </Button>
    </div>
  );
};

export default MeshAssignmentsSection;