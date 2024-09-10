// src/components/Modals/ReferenceMaterialsModal.tsx

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Material {
  name: string;
  tags: string[];
}

interface ReferenceMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: string[];
  onApply: (materials: Material[]) => void;
}

export default function ReferenceMaterialsModal({
  isOpen,
  onClose,
  materials,
  onApply
}: ReferenceMaterialsModalProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [checkedMaterials, setCheckedMaterials] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [materialTags, setMaterialTags] = useState<{ [key: string]: string[] }>({});
  const lastClickedIndex = useRef<number | null>(null);

  const handleMaterialClick = (material: string, index: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (event.shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(index, lastClickedIndex.current);
      const end = Math.max(index, lastClickedIndex.current);
      const newSelectedMaterials = new Set(selectedMaterials);
      for (let i = start; i <= end; i++) {
        newSelectedMaterials.add(materials[i]);
      }
      setSelectedMaterials(newSelectedMaterials);
    } else if (event.ctrlKey) {
      setSelectedMaterials(prev => {
        const newSet = new Set(prev);
        if (newSet.has(material)) {
          newSet.delete(material);
        } else {
          newSet.add(material);
        }
        return newSet;
      });
    } else {
      setSelectedMaterials(new Set([material]));
    }
    lastClickedIndex.current = index;
  };

  const handleCheckboxChange = (material: string) => {
    setCheckedMaterials(prev => {
      const newSet = new Set(prev);
      if (selectedMaterials.has(material)) {
        selectedMaterials.forEach(selectedMaterial => {
          if (newSet.has(selectedMaterial)) {
            newSet.delete(selectedMaterial);
          } else {
            newSet.add(selectedMaterial);
          }
        });
      } else {
        if (newSet.has(material)) {
          newSet.delete(material);
        } else {
          newSet.add(material);
        }
      }
      return newSet;
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setMaterialTags(prev => {
        const newTags = { ...prev };
        selectedMaterials.forEach(material => {
          newTags[material] = [...(newTags[material] || []), tagInput.trim()];
        });
        return newTags;
      });
      setTagInput('');
    }
  };

  const handleApply = () => {
    const updatedMaterials: Material[] = materials
      .filter(material => checkedMaterials.has(material))
      .map(material => ({
        name: material,
        tags: materialTags[material] || []
      }));
    onApply(updatedMaterials);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reference Materials</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {materials.map((material, index) => (
            <div
              key={material}
              className={`flex items-center space-x-2 mb-2 p-2 rounded cursor-pointer ${
                selectedMaterials.has(material) ? 'bg-blue-100' : ''
              }`}
              onClick={(e) => handleMaterialClick(material, index, e)}
            >
              <Checkbox
                checked={checkedMaterials.has(material)}
                onCheckedChange={() => handleCheckboxChange(material)}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{material}</span>
              {materialTags[material] && (
                <div className="flex flex-wrap gap-1">
                  {materialTags[material].map(tag => (
                    <span key={tag} className="bg-blue-200 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
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