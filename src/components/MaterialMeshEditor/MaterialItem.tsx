// src/components/MaterialMeshEditor/MaterialItem.tsx

import React from 'react';
import { Edit2, X, ChevronUp, ChevronDown, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TagList from '@/components/ui/tag-list';
import { cn } from "@/lib/utils";

interface MaterialItemProps {
  material: { name: string; tags: string[] };
  index: number;
  totalItems: number;
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
  onMoveMaterial: (index: number, direction: 'up' | 'down') => void;
  onRemoveTag: (materialName: string, tag: string) => void;
  provided: any;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ 
  material, 
  index,
  totalItems,
  onEditTags, 
  onRenameMaterial, 
  onRemoveMaterial,
  onMoveMaterial,
  onRemoveTag,
  provided 
}) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "group flex justify-between items-center p-4",
        "bg-white dark:bg-gray-800",
        "rounded-lg border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "relative overflow-hidden",
        "cursor-grab active:cursor-grabbing",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        "before:bg-gray-200 dark:before:bg-gray-700",
        "before:group-hover:bg-blue-500 before:transition-colors",
        provided.isDragging && [
          "shadow-lg",
          "z-50",
          "!transform-none",
          "opacity-95",
          "[&_*]:pointer-events-none"
        ]
      )}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {material.name}
          </span>
          <TagList 
            tags={material.tags}
            onRemoveTag={(tag) => onRemoveTag(material.name, tag)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {/* Move Buttons */}
        <div className="flex flex-col mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveMaterial(index, 'up');
                }}
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                disabled={index === 0}
              >
                <ChevronUp className={cn(
                  "h-4 w-4 transition-colors",
                  index === 0 ? "text-gray-300" : "text-gray-600 hover:text-gray-900"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move Up</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveMaterial(index, 'down');
                }}
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                disabled={index === totalItems - 1}
              >
                <ChevronDown className={cn(
                  "h-4 w-4 transition-colors",
                  index === totalItems - 1 ? "text-gray-300" : "text-gray-600 hover:text-gray-900"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move Down</TooltipContent>
          </Tooltip>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTags(material.name);
                }}
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Tags</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameMaterial(material.name);
                }}
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename Material</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMaterial(material.name);
                }}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove Material</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default MaterialItem;