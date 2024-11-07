// src/components/MaterialMeshEditor/MeshItem.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Zap, ChevronUp, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SearchableSelect from '@/components/ui/searchable-select';
import TagSelectionModal from '../Dialogs/TagSelectionModal';

interface MeshItemProps {
  meshName: string;
  assignment: {
    defaultMaterial: string;
    variants: Array<{ name: string; material: string }>;
  };
  materials: Array<{ name: string }>;
  expanded: boolean;
  onToggle: (meshName: string) => void;
  onRename: (meshName: string) => void;
  onRemove: (meshName: string) => void;
  onAutoAssign: (meshName: string, tag: string) => void; // Updated signature
  onAssignmentChange: (meshName: string, field: "defaultMaterial" | "variants", value: string | undefined) => void;
  onVariantChange: (meshName: string, index: number, field: "name" | "material", value: string | undefined) => void;
  onRemoveVariant: (meshName: string, index: number) => void;
  onAddVariant: (meshName: string) => void;
  provided: any;
  index: number;
  totalItems: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  canMove: (index: number, direction: 'up' | 'down') => boolean;
  availableTags: string[]; // Add this new prop
}

const MeshItem: React.FC<MeshItemProps> = ({
  meshName,
  assignment,
  materials,
  expanded,
  onToggle,
  onRename,
  onRemove,
  onAutoAssign,
  onAssignmentChange,
  onVariantChange,
  onRemoveVariant,
  onAddVariant,
  provided,
  index,
  totalItems,
  onMove,
  canMove,
  availableTags
}) => {
  const [expandedVariants, setExpandedVariants] = useState<boolean>(false);
  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);

  // Update the auto-assign button click handler
  const handleAutoAssignClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTagSelectionOpen(true);
  };

  return (
    <Card 
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "group transition-all duration-200",
        expanded ? "shadow-md" : "shadow-sm hover:shadow-md",
        "border-gray-200 dark:border-gray-700",
        "cursor-grab active:cursor-grabbing",
        // Add hover indicator on the left side
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        "before:bg-gray-200 dark:before:bg-gray-700",
        "before:group-hover:bg-blue-500 before:transition-colors",
        "relative"
      )}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onToggle(meshName)}
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {expanded ? 
                <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                <ChevronRight className="h-5 w-5 text-gray-500" />
              }
            </Button>
            <h5 className="font-medium text-lg text-gray-900 dark:text-gray-100">
              {meshName}
            </h5>
            <Badge variant="secondary" className="ml-2">
              {assignment.variants.length} variants
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Move Up/Down Buttons */}
            <div className="flex flex-col mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onMove(index, 'up')}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1"
                    disabled={!canMove(index, 'up')}
                  >
                    <ChevronUp size={16} className={cn(
                      "transition-colors",
                      !canMove(index, 'up') ? "text-gray-300" : "text-gray-600 hover:text-gray-900"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Up</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onMove(index, 'down')}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1"
                    disabled={!canMove(index, 'down')}
                  >
                    <ChevronDown size={16} className={cn(
                      "transition-colors",
                      !canMove(index, 'down') ? "text-gray-300" : "text-gray-600 hover:text-gray-900"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move Down</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onRename(meshName)} 
                  variant="outline" 
                  size="sm"
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Rename
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rename mesh</TooltipContent>
            </Tooltip>

            <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={handleAutoAssignClick} 
              variant="outline"
              size="sm"
              className="hover:bg-blue-50 dark:hover:bg-blue-900"
            >
              <Zap className="h-4 w-4 text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto-assign by tag</TooltipContent>
        </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onRemove(meshName)} 
                  variant="outline" 
                  size="sm"
                  className="hover:bg-red-50 dark:hover:bg-red-900"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove mesh</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* Default Material Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Default Material
            </label>
            <SearchableSelect
              value={assignment.defaultMaterial}
              onValueChange={(value) => onAssignmentChange(meshName, "defaultMaterial", value)}
              options={materials}
              placeholder="Select a material"
              className="w-full"
            />
          </div>

          {/* Variants Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Variant Materials
              </label>
              <Button
                onClick={() => setExpandedVariants(!expandedVariants)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                {expandedVariants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {expandedVariants && (
              <Card className="border border-gray-200 dark:border-gray-700">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Variant Name</TableHead>
                        <TableHead className="w-[50%]">Material</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignment.variants.map((variant, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={variant.name}
                              onChange={(e) => onVariantChange(meshName, index, "name", e.target.value)}
                              placeholder="Variant name"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <SearchableSelect
                              value={variant.material}
                              onValueChange={(value) => onVariantChange(meshName, index, "material", value)}
                              options={materials}
                              placeholder="Select a material"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => onRemoveVariant(meshName, index)}
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-red-50 dark:hover:bg-red-900"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove variant</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => onAddVariant(meshName)}
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </CardContent>
      )}

      <TagSelectionModal
        isOpen={isTagSelectionOpen}
        onClose={() => setIsTagSelectionOpen(false)}
        onSelectTag={(tag) => onAutoAssign(meshName, tag)}
        tags={availableTags}
      />
    </Card>
  );
};

export default MeshItem;