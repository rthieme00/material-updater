// src/components/MaterialMeshEditor/MaterialItem.tsx

import React from 'react';
import { Move, Tag, Edit2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
      className="flex justify-between items-center p-3 bg-white mb-2 rounded shadow hover:shadow-md transition-shadow"
    >
      <div className="flex items-center flex-1">
        <div {...provided.dragHandleProps} className="mr-2 cursor-grab">
          <Move size={16} className="text-gray-500" />
        </div>
        <span className="font-medium">{material.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="mr-4">
          {material.tags.map(tag => (
            <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-col mr-2">
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
        </div>
        <Button 
          onClick={() => onEditTags(material.name)}
          variant="ghost"
          size="sm"
          className="text-blue-500 hover:text-blue-700"
          title="Edit Tags"
        >
          <Tag size={16} />
        </Button>
        <Button 
          onClick={() => onRenameMaterial(material.name)}
          variant="ghost"
          size="sm"
          className="text-blue-500 hover:text-blue-700"
          title="Rename Material"
        >
          <Edit2 size={16} />
        </Button>
        <Button 
          onClick={() => onRemoveMaterial(material.name)}
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700"
          title="Remove Material"
        >
          <X size={16} />
        </Button>
      </div>
    </li>
  );
};

export default MaterialItem;