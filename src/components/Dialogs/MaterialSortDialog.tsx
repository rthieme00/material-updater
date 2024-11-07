// src/components/Dialogs/MaterialSortDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, ChevronUp, ChevronDown, Power } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Material {
  name: string;
  tags: string[];
}

interface MaterialSortDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onApplySort: (sortedMaterials: Material[]) => void;
}

interface TagState {
  name: string;
  enabled: boolean;
}

export default function MaterialSortDialog({
  isOpen,
  onClose,
  materials,
  onApplySort
}: MaterialSortDialogProps) {
  const [tagStates, setTagStates] = useState<TagState[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMaterials, setPreviewMaterials] = useState<Material[]>([]);
  
  const updateMaterialOrder = (currentTagStates: TagState[]) => {
    const enabledTags = currentTagStates
      .filter(tag => tag.enabled)
      .map(tag => tag.name);

    // Create a map of materials by tag for quick lookup
    const materialsByTag = new Map<string, Material[]>();
    enabledTags.forEach(tag => {
      if (tag === 'Untagged') {
        materialsByTag.set(tag, materials.filter(m => m.tags.length === 0));
      } else {
        materialsByTag.set(tag, materials.filter(m => m.tags.includes(tag)));
      }
    });

    // Sort materials within each tag alphabetically
    materialsByTag.forEach((tagMaterials, tag) => {
      materialsByTag.set(tag, [...tagMaterials].sort((a, b) => a.name.localeCompare(b.name)));
    });

    // Create the final sorted array based on tag priority
    const sortedMaterials: Material[] = [];
    const processedMaterials = new Set<string>();

    // First, add materials in order of tag priority
    enabledTags.forEach(tag => {
      const tagMaterials = materialsByTag.get(tag) || [];
      tagMaterials.forEach(material => {
        if (!processedMaterials.has(material.name)) {
          sortedMaterials.push(material);
          processedMaterials.add(material.name);
        }
      });
    });


    // Add remaining materials alphabetically
    const remainingMaterials = materials
      .filter(m => !processedMaterials.has(m.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    sortedMaterials.push(...remainingMaterials);
    setPreviewMaterials(sortedMaterials);
  };
  
      // Initialize tag states
      useEffect(() => {
        if (isOpen) {
          const uniqueTags = Array.from(new Set(materials.flatMap(m => m.tags)));
          const initialTagStates = uniqueTags
            .sort()
            .map(tag => ({ name: tag, enabled: true }));
          
          // Add "Untagged" as the last tag
          initialTagStates.push({ name: 'Untagged', enabled: true });
          
          setTagStates(initialTagStates);
          updateMaterialOrder(initialTagStates);
        }
      }, [isOpen, materials, updateMaterialOrder]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(tagStates);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTagStates(items);
    updateMaterialOrder(items);
  };

  const toggleTag = (tagName: string) => {
    const newTagStates = tagStates.map(tag => 
      tag.name === tagName ? { ...tag, enabled: !tag.enabled } : tag
    );
    setTagStates(newTagStates);
    updateMaterialOrder(newTagStates);
  };

  const handleApply = () => {
    onApplySort(previewMaterials);
    onClose();
  };

  const moveTag = (index: number, direction: 'up' | 'down') => {
    if (tagStates[index].name === 'Untagged') return; // Don't move Untagged
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Check if move is possible
    if (newIndex < 0 || newIndex >= tagStates.length) return;
    if (tagStates[newIndex].name === 'Untagged') return; // Don't swap with Untagged
    
    const newTagStates = [...tagStates];
    [newTagStates[index], newTagStates[newIndex]] = [newTagStates[newIndex], newTagStates[index]];
    
    setTagStates(newTagStates);
    updateMaterialOrder(newTagStates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Sort Materials by Tag Priority</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tag Priority Order</h3>
            <p className="text-sm text-muted-foreground">
              Drag tags or use arrow buttons to set priority. Toggle switches to enable/disable tags. 
              Materials will be sorted by enabled tags in order, then alphabetically within each tag.
            </p>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="tags">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {tagStates.map((tag, index) => (
                    <Draggable 
                      key={tag.name} 
                      draggableId={tag.name} 
                      index={index}
                      isDragDisabled={tag.name === 'Untagged'}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            snapshot.isDragging ? "bg-accent" : "bg-background",
                            !tag.enabled && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-grab",
                                tag.name === 'Untagged' && "invisible"
                              )}
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{tag.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tag.name !== 'Untagged' && (
                              <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => moveTag(index, 'up')}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => moveTag(index, 'down')}
                                  disabled={index === tagStates.length - 2} // -2 because Untagged is always last
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <Switch
                              checked={tag.enabled}
                              onCheckedChange={() => toggleTag(tag.name)}
                              className="ml-2"
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <Input
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {previewMaterials
                .filter(material =>
                  material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((material, index) => (
                  <div
                    key={material.name}
                    className="flex flex-col gap-1 p-2 border-b last:border-b-0"
                  >
                    <span className="font-medium">{material.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {material.tags.length === 0 ? (
                        <Badge variant="secondary" className="opacity-50">
                          Untagged
                        </Badge>
                      ) : (
                        material.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={
                              tagStates.find(t => t.name === tag)?.enabled
                                ? 'opacity-100'
                                : 'opacity-50'
                            }
                          >
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleApply}>Apply Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}