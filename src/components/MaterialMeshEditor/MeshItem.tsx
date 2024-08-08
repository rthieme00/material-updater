// src/components/MaterialMeshEditor/MeshItem.tsx

import React from 'react';
import { ChevronDown, ChevronRight, X, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MeshItemProps {
  meshName: string;
  assignment: any;
  materials: any[];
  expanded: boolean;
  onToggle: (meshName: string) => void;
  onRename: (meshName: string) => void;
  onRemove: (meshName: string) => void;
  onAutoAssign: (meshName: string) => void;
  onAssignmentChange: (meshName: string, field: string, value: string) => void;
  onVariantChange: (meshName: string, index: number, field: string, value: string) => void;
  onRemoveVariant: (meshName: string, index: number) => void;
  onAddVariant: (meshName: string) => void;
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
  onAddVariant
}) => {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <h5 className="font-medium text-lg">{meshName}</h5>
        <div className="flex items-center space-x-2">
          <Button onClick={() => onRename(meshName)} variant="outline" size="sm">
            Rename
          </Button>
          <Button onClick={() => onRemove(meshName)} variant="outline" size="sm">
            Remove
          </Button>
          <Button 
            onClick={() => onAutoAssign(meshName)} 
            variant="outline"
            size="sm"
            title="Auto-assign Tag"
          >
            <Zap size={16} />
          </Button>
          <Button
            onClick={() => onToggle(meshName)}
            variant="ghost"
            size="sm"
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Material:</label>
              <Select
                value={assignment.defaultMaterial || undefined}
                onValueChange={(value) => onAssignmentChange(meshName, 'defaultMaterial', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(material => (
                    <SelectItem key={material.name} value={material.name}>{material.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Variant Materials:</label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant Name</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignment.variants.map((variant: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={variant.name}
                          onChange={(e) => onVariantChange(meshName, index, 'name', e.target.value)}
                          placeholder="Variant name"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={variant.material || undefined}
                          onValueChange={(value) => onVariantChange(meshName, index, 'material', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(material => (
                              <SelectItem key={material.name} value={material.name}>{material.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => onRemoveVariant(meshName, index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                onClick={() => onAddVariant(meshName)}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Add Variant
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MeshItem;