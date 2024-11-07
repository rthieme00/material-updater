// src/components/MaterialMeshEditor/MeshItem.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Zap, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import SearchableSelect from '@/components/ui/searchable-select';

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
  onAutoAssign: (meshName: string) => void;
  onAssignmentChange: (meshName: string, field: "defaultMaterial" | "variants", value: string | undefined) => void;
  onVariantChange: (meshName: string, index: number, field: "name" | "material", value: string | undefined) => void;
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
  const [expandedVariants, setExpandedVariants] = useState<boolean>(false);

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
              <SearchableSelect
                value={assignment.defaultMaterial}
                onValueChange={(value) => onAssignmentChange(meshName, "defaultMaterial", value)}
                options={materials}
                placeholder="Select a material"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Variant Materials:</label>
                <Button
                  onClick={() => setExpandedVariants(!expandedVariants)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  {expandedVariants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </div>

              {expandedVariants && (
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant Name</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Actions</TableHead>
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
                            <Button
                              onClick={() => onRemoveVariant(meshName, index)}
                              variant="ghost"
                              size="sm"
                              className="hover:text-destructive"
                            >
                              <X size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              <Button
                onClick={() => onAddVariant(meshName)}
                variant="outline"
                size="sm"
                className="w-full mt-2"
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