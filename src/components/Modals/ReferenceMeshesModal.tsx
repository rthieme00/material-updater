// src/components/Modals/ReferenceMeshesModal.tsx

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Mesh {
  name: string;
  tags: string[];
}

interface ReferenceMeshesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meshes: string[];
  onApply: (meshes: Mesh[], meshAssignments: { [key: string]: { defaultMaterial: string; variants: { name: string; material: string }[] } }) => void;
}

export default function ReferenceMeshesModal({
  isOpen,
  onClose,
  meshes,
  onApply
}: ReferenceMeshesModalProps) {
  const [selectedMeshes, setSelectedMeshes] = useState<Set<string>>(new Set());
  const [checkedMeshes, setCheckedMeshes] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [meshTags, setMeshTags] = useState<{ [key: string]: string[] }>({});
  const [meshAssignments, setMeshAssignments] = useState<{ [key: string]: { defaultMaterial: string; variants: { name: string; material: string }[] } }>({});
  const lastClickedIndex = useRef<number | null>(null);

  const handleMeshClick = (mesh: string, index: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (event.shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(index, lastClickedIndex.current);
      const end = Math.max(index, lastClickedIndex.current);
      const newSelectedMeshes = new Set(selectedMeshes);
      for (let i = start; i <= end; i++) {
        newSelectedMeshes.add(meshes[i]);
      }
      setSelectedMeshes(newSelectedMeshes);
    } else if (event.ctrlKey) {
      setSelectedMeshes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mesh)) {
          newSet.delete(mesh);
        } else {
          newSet.add(mesh);
        }
        return newSet;
      });
    } else {
      setSelectedMeshes(new Set([mesh]));
    }
    lastClickedIndex.current = index;
  };

  const handleCheckboxChange = (mesh: string) => {
    setCheckedMeshes(prev => {
      const newSet = new Set(prev);
      if (selectedMeshes.has(mesh)) {
        selectedMeshes.forEach(selectedMesh => {
          if (newSet.has(selectedMesh)) {
            newSet.delete(selectedMesh);
          } else {
            newSet.add(selectedMesh);
          }
        });
      } else {
        if (newSet.has(mesh)) {
          newSet.delete(mesh);
        } else {
          newSet.add(mesh);
        }
      }
      return newSet;
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setMeshTags(prev => {
        const newTags = { ...prev };
        selectedMeshes.forEach(mesh => {
          newTags[mesh] = [...(newTags[mesh] || []), tagInput.trim()];
        });
        return newTags;
      });
      setTagInput('');
    }
  };

  const handleApply = () => {
    const updatedMeshes: Mesh[] = meshes
      .filter(mesh => checkedMeshes.has(mesh))
      .map(mesh => ({
        name: mesh,
        tags: meshTags[mesh] || []
      }));

    const updatedMeshAssignments: { [key: string]: { defaultMaterial: string; variants: { name: string; material: string }[] } } = {};
    checkedMeshes.forEach(mesh => {
      updatedMeshAssignments[mesh] = meshAssignments[mesh] || { defaultMaterial: '', variants: [] };
    });

    onApply(updatedMeshes, updatedMeshAssignments);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reference Meshes</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {meshes.map((mesh, index) => (
            <div
              key={mesh}
              className={`flex items-center space-x-2 mb-2 p-2 rounded cursor-pointer ${
                selectedMeshes.has(mesh) ? 'bg-green-100' : ''
              }`}
              onClick={(e) => handleMeshClick(mesh, index, e)}
            >
              <Checkbox
                checked={checkedMeshes.has(mesh)}
                onCheckedChange={() => handleCheckboxChange(mesh)}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{mesh}</span>
              {meshTags[mesh] && (
                <div className="flex flex-wrap gap-1">
                  {meshTags[mesh].map(tag => (
                    <span key={tag} className="bg-green-200 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Enter tag"
          />
          <Button onClick={handleAddTag} variant="outline">Add Tag</Button>
        </div>
        <DialogFooter>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}