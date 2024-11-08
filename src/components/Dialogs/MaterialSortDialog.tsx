// src/components/Dialogs/MaterialSortDialog.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Material {
  name: string;
  tags: string[];
}

interface TagState {
  name: string;
  enabled: boolean;
}

const STORAGE_KEY = 'materialSortSettings';

interface MaterialSortSettings {
  tagStates: TagState[];
  timestamp: number;
}

interface MaterialSortDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onApplySort: (sortedMaterials: Material[]) => void;
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

  // Load saved settings and initialize tag states
  useEffect(() => {
    if (isOpen) {
      const uniqueTags = Array.from(new Set(materials.flatMap(m => m.tags)));
      
      // Try to load saved settings
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      let initialTagStates: TagState[] = [];

      if (savedSettings) {
        try {
          const parsed: MaterialSortSettings = JSON.parse(savedSettings);
          const savedTagStates = parsed.tagStates;

          // Create a map of saved tag states
          const savedTagStateMap = new Map(
            savedTagStates.map(tag => [tag.name, tag])
          );

          // Initialize tags with saved states or defaults for new tags
          initialTagStates = uniqueTags
            .map(tag => ({
              name: tag,
              enabled: savedTagStateMap.get(tag)?.enabled ?? true
            }));

          // Add any saved tags that still exist
          savedTagStates.forEach(savedTag => {
            if (!initialTagStates.some(t => t.name === savedTag.name) && 
                savedTag.name === 'Untagged') {
              initialTagStates.push(savedTag);
            }
          });
        } catch (error) {
          console.error('Error loading saved sort settings:', error);
          // Fall back to default initialization
          initialTagStates = uniqueTags
            .sort()
            .map(tag => ({ name: tag, enabled: true }));
        }
      } else {
        // No saved settings, use default initialization
        initialTagStates = uniqueTags
          .sort()
          .map(tag => ({ name: tag, enabled: true }));
      }

      // Ensure 'Untagged' is always present
      if (!initialTagStates.some(tag => tag.name === 'Untagged')) {
        initialTagStates.push({ name: 'Untagged', enabled: true });
      }

      setTagStates(initialTagStates);
      setPreviewMaterials([...materials]);
    }
  }, [isOpen, materials]);

  // Save settings whenever tag states change
  useEffect(() => {
    if (tagStates.length > 0) {
      const settings: MaterialSortSettings = {
        tagStates,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [tagStates]);

  const sortMaterialsByTags = useCallback((currentTagStates: TagState[]) => {
    // Include all tags in order, not just enabled ones
    const tagOrder = currentTagStates
      .filter(tag => tag.name !== 'Untagged')
      .map(tag => tag.name);
    
    const isUntaggedEnabled = currentTagStates.find(t => t.name === 'Untagged')?.enabled ?? true;
  
    // Create groups for each tag and special groups
    const materialGroups = new Map<string, Material[]>();
    tagOrder.forEach(tag => materialGroups.set(tag, []));
    materialGroups.set('untagged', []);
    materialGroups.set('remaining', []); // For materials that don't match any tag
  
    // Helper function to find the highest priority tag for a material
    const findHighestPriorityTag = (material: Material): string | null => {
      for (const tag of tagOrder) {
        if (material.tags.includes(tag)) {
          return tag;
        }
      }
      return null;
    };
  
    // Distribute materials into groups based on tag priority
    [...materials].forEach(material => {
      if (material.tags.length === 0) {
        materialGroups.get('untagged')?.push(material);
        return;
      }
  
      const highestPriorityTag = findHighestPriorityTag(material);
      if (highestPriorityTag) {
        materialGroups.get(highestPriorityTag)?.push(material);
      } else {
        materialGroups.get('remaining')?.push(material);
      }
    });
  
    // Sort groups based on their enabled state
    tagOrder.forEach(tag => {
      const group = materialGroups.get(tag);
      const tagState = currentTagStates.find(t => t.name === tag);
      
      if (group && tagState?.enabled) {
        // Only sort if the tag is enabled
        materialGroups.set(tag, group.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
  
    // Handle untagged materials
    const untaggedGroup = materialGroups.get('untagged');
    if (untaggedGroup && isUntaggedEnabled) {
      materialGroups.set('untagged', untaggedGroup.sort((a, b) => a.name.localeCompare(b.name)));
    }
  
    // Build final sorted array maintaining tag priority order
    const result: Material[] = [];
    
    // Add materials according to tag priority
    tagOrder.forEach(tag => {
      const group = materialGroups.get(tag);
      if (group && group.length > 0) {
        result.push(...group);
      }
    });
  
    // Add untagged materials
    const untaggedMaterials = materialGroups.get('untagged') || [];
    if (untaggedMaterials.length > 0) {
      result.push(...untaggedMaterials);
    }
  
    // Add any remaining materials
    const remainingMaterials = materialGroups.get('remaining') || [];
    if (remainingMaterials.length > 0) {
      result.push(...remainingMaterials);
    }
  
    return result;
  }, [materials]);

  useEffect(() => {
    if (tagStates.length > 0) {
      const sorted = sortMaterialsByTags(tagStates);
      setPreviewMaterials(sorted);
    }
  }, [tagStates, sortMaterialsByTags]);

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    setPreviewMaterials(prev => {
      const items = Array.from(prev);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      return items;
    });
  }, []);

  const toggleTag = (tagName: string) => {
    const newTagStates = tagStates.map(tag => 
      tag.name === tagName ? { ...tag, enabled: !tag.enabled } : tag
    );
    setTagStates(newTagStates);
  };

  const moveTag = (index: number, direction: 'up' | 'down') => {
    if (tagStates[index].name === 'Untagged') return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= tagStates.length) return;
    if (tagStates[newIndex].name === 'Untagged') return;
    
    const newTagStates = [...tagStates];
    [newTagStates[index], newTagStates[newIndex]] = [newTagStates[newIndex], newTagStates[index]];
    
    setTagStates(newTagStates);
  };

  // Reset button handler
  const handleResetSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
    const uniqueTags = Array.from(new Set(materials.flatMap(m => m.tags)));
    const resetTagStates = uniqueTags
      .sort()
      .map(tag => ({ name: tag, enabled: true }));
    resetTagStates.push({ name: 'Untagged', enabled: true });
    setTagStates(resetTagStates);
  };

  const handleApply = () => {
    onApplySort(previewMaterials);
    onClose();
  };

  const filteredMaterials = previewMaterials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] h-[90vh] my-4">
        <DialogHeader className="pb-4">
          <DialogTitle>Sort Materials by Tag Priority</DialogTitle>
          <DialogDescription>
            Drag materials to reorder them manually, or use tag priorities to automatically sort them.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tag Priority Order</h3>
              <p className="text-sm text-muted-foreground">
                Drag tags or use arrow buttons to set priority. Toggle switches to enable/disable sorting.
              </p>
            </div>

            <div className="space-y-2">
              {tagStates.map((tag, index) => (
                <div
                  key={tag.name}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    !tag.enabled && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
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
                          disabled={index === tagStates.length - 2}
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
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Preview</h3>
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="materials">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {filteredMaterials.map((material, index) => (
                        <Draggable
                          key={material.name}
                          draggableId={material.name}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "flex flex-col gap-1 p-3 rounded-lg border",
                                "bg-white dark:bg-gray-800",
                                "cursor-grab active:cursor-grabbing",
                                "transition-all duration-200",
                                snapshot.isDragging && [
                                  "shadow-lg",
                                  "z-50",
                                  "!transform-none",
                                  "opacity-95",
                                  "[&_*]:pointer-events-none"
                                ]
                              )}
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
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              onClick={handleResetSettings} 
              variant="outline" 
              size="sm"
            >
              Reset to Default
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}