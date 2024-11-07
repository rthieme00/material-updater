// src/components/MaterialMeshEditor/PreviewVariantsSection.tsx

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MeshAssignment } from '@/gltf/gltfTypes';

interface PreviewVariantsSectionProps {
  meshAssignments: { [key: string]: MeshAssignment };
  materials: Array<{ name: string; tags: string[] }>;
}

const PreviewVariantsSection: React.FC<PreviewVariantsSectionProps> = ({
  meshAssignments,
  materials,
}) => {
  const variantPreview = useMemo(() => {
    const variants = new Map<string, Set<string>>();
    const meshToVariants = new Map<string, string[]>();

    // First pass: collect all unique variants and their materials
    Object.entries(meshAssignments).forEach(([meshName, assignment]) => {
      const meshVariants = assignment.variants.map(v => v.name);
      meshToVariants.set(meshName, meshVariants);

      assignment.variants.forEach(variant => {
        if (!variants.has(variant.name)) {
          variants.set(variant.name, new Set());
        }
        variants.get(variant.name)?.add(variant.material);
      });
    });

    // Sort variants by their first appearance in mesh order
    const sortedVariants = Array.from(variants.keys()).sort((a, b) => {
      const meshEntries = Array.from(meshToVariants.entries());
      
      for (let i = 0; i < meshEntries.length; i++) {
        const [meshName, meshVariants] = meshEntries[i];
        const indexA = meshVariants.indexOf(a);
        const indexB = meshVariants.indexOf(b);
        
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
      }
      return 0;
    });

    return {
      variants: sortedVariants,
      materialsMap: variants,
      meshToVariants
    };
  }, [meshAssignments]);

  const getMaterialTags = (materialName: string) => {
    return materials.find(m => m.name === materialName)?.tags || [];
  };

  if (Object.keys(meshAssignments).length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No mesh assignments found. Add some meshes and variants to see the preview.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-15rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Variant Name</TableHead>
                <TableHead>Affected Meshes</TableHead>
                <TableHead>Materials Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variantPreview.variants.map((variantName) => {
                const affectedMeshes = Object.entries(meshAssignments)
                  .filter(([_, assignment]) => 
                    assignment.variants.some(v => v.name === variantName)
                  )
                  .map(([meshName]) => meshName);

                const materials = Array.from(variantPreview.materialsMap.get(variantName) || []);

                return (
                  <TableRow key={variantName}>
                    <TableCell className="font-medium">
                      {variantName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {affectedMeshes.map((mesh) => (
                          <Badge
                            key={mesh}
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                          >
                            {mesh}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {materials.map((material) => (
                          <div key={material} className="flex flex-wrap gap-1 items-center">
                            <span className="text-sm font-medium">{material}</span>
                            {getMaterialTags(material).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PreviewVariantsSection;