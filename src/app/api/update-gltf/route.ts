import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { gltfData, materials, meshAssignments } = await req.json();
    
    // Update materials
    gltfData.materials = materials.map((material: any) => ({
      name: material.name,
      // ... other material properties
    }));

    // Update mesh assignments
    Object.entries(meshAssignments).forEach(([meshName, assignment]: [string, any]) => {
      const meshIndex = gltfData.meshes.findIndex((mesh: any) => mesh.name === meshName);
      if (meshIndex !== -1) {
        gltfData.meshes[meshIndex].primitives.forEach((primitive: any) => {
          primitive.material = materials.findIndex((m: any) => m.name === assignment.defaultMaterial);
          
          if (assignment.variants.length > 0) {
            primitive.extensions = primitive.extensions || {};
            primitive.extensions.KHR_materials_variants = {
              mappings: assignment.variants.map((variant: any) => ({
                variants: [materials.findIndex((m: any) => m.name === variant.material)],
                material: materials.findIndex((m: any) => m.name === variant.material)
              }))
            };
          } else {
            delete primitive.extensions?.KHR_materials_variants;
          }
        });
      }
    });

    // Save updated GLTF file
    const filePath = path.join(process.cwd(), 'public', 'updated.gltf');
    await fs.writeFile(filePath, JSON.stringify(gltfData, null, 2));
    
    return NextResponse.json({ message: 'GLTF file updated successfully' });
  } catch (error) {
    console.error('Error updating GLTF file:', error);
    return NextResponse.json({ error: 'Error updating GLTF file' }, { status: 500 });
  }
}