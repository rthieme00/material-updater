// src/components/MaterialMeshEditor/MaterialItem.tsx

import React from 'react';
import { Move, Tag, Edit2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface MaterialItemProps {
  material: { name: string; tags: string[] };
  onEditTags: (name: string) => void;
  onRenameMaterial: (name: string) => void;
  onRemoveMaterial: (name: string) => void;
  provided: any;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ 
  material, 
  onEditTags, 
  onRenameMaterial, 
  onRemoveMaterial, 
  provided 
}) => {
  return (
    <li
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="flex justify-between items-center p-3 bg-white mb-2 rounded shadow"
    >
      <div className="flex items-center">
        <Move size={16} className="mr-2 text-gray-500" />
        <span className="font-medium">{material.name}</span>
      </div>
      <div className="flex items-center">
        <div className="mr-4">
          {material.tags.map(tag => (
            <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
              {tag}
            </span>
          ))}
        </div>
        <Button 
          onClick={() => onEditTags(material.name)}
          variant="ghost"
          size="sm"
          className="text-blue-500 hover:text-blue-700 mr-2"
          title="Edit Tags"
        >
          <Tag size={16} />
        </Button>
        <Button 
          onClick={() => onRenameMaterial(material.name)}
          variant="ghost"
          size="sm"
          className="text-blue-500 hover:text-blue-700 mr-2"
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