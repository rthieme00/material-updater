// src/components/MaterialMeshEditor/MaterialItem.tsx

import React from 'react';
import { Move, Tag, Edit2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MaterialItemProps {
  material: { name: string; tags: string[] };
  index: number;
  totalItems: number;
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
  onMoveMaterial: (index: number, direction: 'up' | 'down') => void;
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
  provided 
}) => {
  return (
    <li
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "group flex justify-between items-center p-4 bg-white dark:bg-gray-800",
        "rounded-lg border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "relative overflow-hidden"
      )}
    >
      {/* Drag Handle */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors" />
      
      <div className="flex items-center flex-1 ml-2">
        <div 
          {...provided.dragHandleProps} 
          className="mr-3 cursor-grab hover:text-blue-500 transition-colors"
        >
          <Move size={16} />
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {material.name}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {material.tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Move Buttons */}
        <div className="flex flex-col mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onMoveMaterial(index, 'up')}
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                disabled={index === 0}
              >
                <ChevronUp size={16} className={cn(
                  "transition-colors",
                  index === 0 ? "text-gray-300" : "text-gray-600 hover:text-gray-900"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move Up</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onMoveMaterial(index, 'down')}
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                disabled={index === totalItems - 1}
              >
                <ChevronDown size={16} className={cn(
                  "transition-colors",
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
                onClick={() => onEditTags(material.name)}
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              >
                <Tag size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Tags</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => onRenameMaterial(material.name)}
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename Material</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => onRemoveMaterial(material.name)}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove Material</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </li>
  );
};

export default MaterialItem;