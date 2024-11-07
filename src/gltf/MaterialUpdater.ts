// src/gltf/MaterialUpdater.ts

import { MaterialData, GltfData, ExportedVariant, GltfMaterial, GltfMesh, GltfTexture, GltfImage, MeshAssignment } from '@/gltf/gltfTypes';
import { cloneDeep } from 'lodash';

// Helper function to create a mapping between old and new material indices
function createMaterialIndexMapping(
  oldMaterials: GltfMaterial[],
  newMaterials: GltfMaterial[]
): Map<number, number> {
  const mapping = new Map<number, number>();
  oldMaterials.forEach((oldMaterial, oldIndex) => {
    const newIndex = newMaterials.findIndex(m => m.name === oldMaterial.name);
    if (newIndex !== -1) {
      mapping.set(oldIndex, newIndex);
    }
  });
  return mapping;
}

// Helper function to update material indices in variant mappings
function updateVariantMappings(
  primitive: any,
  materialIndexMapping: Map<number, number>
) {
  if (primitive.extensions?.KHR_materials_variants?.mappings) {
    primitive.extensions.KHR_materials_variants.mappings = 
      primitive.extensions.KHR_materials_variants.mappings.map((mapping: any) => ({
        ...mapping,
        material: materialIndexMapping.get(mapping.material) ?? mapping.material
      }));
  }
}

// Helper function to validate material assignments
function validateMaterialAssignments(
  meshName: string,
  assignment: any,
  materials: GltfMaterial[]
): boolean {
  const materialNames = new Set(materials.map(m => m.name));
  
  // Check default material
  if (assignment.defaultMaterial && !materialNames.has(assignment.defaultMaterial)) {
    console.warn(`Invalid default material "${assignment.defaultMaterial}" for mesh "${meshName}"`);
    return false;
  }

  // Check variant materials
  for (const variant of assignment.variants) {
    if (!materialNames.has(variant.material)) {
      console.warn(`Invalid variant material "${variant.material}" for mesh "${meshName}"`);
      return false;
    }
  }

  return true;
}

function findAOImageIndex(images: GltfImage[]): number {
  return images.findIndex(image => image.name && image.name.endsWith('_AO'));
}

function findAOTextureIndex(textures: GltfTexture[]): number {
  return textures.findIndex(texture => texture.name && texture.name.endsWith('tex_AmbientOcclusion_A'));
}

// Add a new helper function to get ordered variants
function getOrderedVariants(meshAssignments: { [key: string]: MeshAssignment }): string[] {
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
      const [_, meshVariants] = meshEntries[i];
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

  return sortedVariants;
}

// Modify the applyVariants function
function applyVariants(targetData: GltfData, materialData: MaterialData) {
  if (!targetData.extensions) targetData.extensions = {};
  if (!targetData.extensions.KHR_materials_variants) {
    targetData.extensions.KHR_materials_variants = { variants: [] };
  }

  // Get ordered variants
  const orderedVariants = getOrderedVariants(materialData.meshAssignments);
  
  // Clear existing variants and add them in the correct order
  targetData.extensions.KHR_materials_variants.variants = 
    orderedVariants.map(name => ({ name }));

  // Create material name to index mapping
  const materialNameToIndex = new Map(
    targetData.materials.map((material, index) => [material.name, index])
  );

  // Create variant name to index mapping (now preserving order)
  const variantNameToIndex = new Map(
    orderedVariants.map((name, index) => [name, index])
  );

  // Apply material assignments to meshes
  targetData.meshes.forEach((mesh: GltfMesh) => {
    const meshAssignment = materialData.meshAssignments[mesh.name];
    if (!meshAssignment) return;

    // Validate material assignments before applying
    if (!validateMaterialAssignments(mesh.name, meshAssignment, targetData.materials)) {
      console.warn(`Skipping invalid material assignments for mesh "${mesh.name}"`);
      return;
    }

    mesh.primitives.forEach(primitive => {
      if (!primitive.extensions) primitive.extensions = {};
      if (!primitive.extensions.KHR_materials_variants) {
        primitive.extensions.KHR_materials_variants = { mappings: [] };
      }

      // Clear existing mappings to prevent duplicates
      primitive.extensions.KHR_materials_variants.mappings = [];

      // Set default material if specified
      if (meshAssignment.defaultMaterial) {
        const defaultMaterialIndex = materialNameToIndex.get(meshAssignment.defaultMaterial);
        if (defaultMaterialIndex !== undefined) {
          primitive.material = defaultMaterialIndex;
        }
      }

      // Sort variants to match the global order
      const sortedVariants = meshAssignment.variants
        .sort((a, b) => {
          const indexA = orderedVariants.indexOf(a.name);
          const indexB = orderedVariants.indexOf(b.name);
          return indexA - indexB;
        });

      // Add variant mappings in the correct order
      sortedVariants.forEach(variant => {
        const materialIndex = materialNameToIndex.get(variant.material);
        const variantIndex = variantNameToIndex.get(variant.name);

        if (materialIndex !== undefined && variantIndex !== undefined) {
          primitive.extensions!.KHR_materials_variants!.mappings.push({
            material: materialIndex,
            variants: [variantIndex]
          });
        } else {
          console.warn(
            `Unable to create variant mapping for mesh "${mesh.name}": ` +
            `material "${variant.material}" or variant "${variant.name}" not found`
          );
        }
      });
    });
  });
}

function applyMoodRotation(targetData: GltfData, isBlavalen: boolean) {
  targetData.materials.forEach((material: GltfMaterial) => {
    if (material.name.startsWith('MOO-')) {
      const rotation = isBlavalen ? 0 : 1.56;
      const applyRotation = (texture: any) => {
        if (texture && texture.extensions && texture.extensions.KHR_texture_transform) {
          texture.extensions.KHR_texture_transform.rotation = rotation;
        }
      };

      if (material.normalTexture) applyRotation(material.normalTexture);
      if (material.pbrMetallicRoughness?.baseColorTexture) applyRotation(material.pbrMetallicRoughness.baseColorTexture);
      if (material.extensions?.KHR_materials_sheen?.sheenColorTexture) applyRotation(material.extensions.KHR_materials_sheen.sheenColorTexture);
    }
  });
}

export async function updateMaterials(
  referenceData: GltfData,
  targetData: GltfData,
  model: string,
  applyVariantsFlag: boolean,
  applyMoodRotationFlag: boolean,
  materialData: MaterialData,
  refFileName: string,
  targetFileName: string,
  progressCallback: (progress: number) => void
): Promise<ArrayBuffer> {
  if (!materialData) {
    throw new Error("Material JSON data is missing. Please upload a valid Materials.json file.");
  }

  try {
    // Copy extensions from reference
    targetData.extensions = referenceData.extensions;
    targetData.extensionsRequired = referenceData.extensionsRequired;
    targetData.extensionsUsed = referenceData.extensionsUsed;

    progressCallback(0.2);

    // Create ordered materials array based on materialData
    const orderedMaterials: GltfMaterial[] = [];
    const materialNameToNewIndex = new Map<string, number>();

    // First, add materials in the order specified in materialData
    materialData.materials.forEach((jsonMaterial, index) => {
      const refMaterial = referenceData.materials.find(m => m.name === jsonMaterial.name);
      if (refMaterial) {
        orderedMaterials.push(refMaterial);
        materialNameToNewIndex.set(jsonMaterial.name, index);
      }
    });

    // Then add any remaining materials from the reference that weren't in materialData
    referenceData.materials.forEach(material => {
      if (!materialNameToNewIndex.has(material.name)) {
        materialNameToNewIndex.set(material.name, orderedMaterials.length);
        orderedMaterials.push(material);
      }
    });

    // Create mapping from old indices to new indices
    const materialIndexMapping = new Map<number, number>();
    referenceData.materials.forEach((material, oldIndex) => {
      const newIndex = materialNameToNewIndex.get(material.name);
      if (newIndex !== undefined) {
        materialIndexMapping.set(oldIndex, newIndex);
      }
    });

    progressCallback(0.4);

    // Update material references in meshes and variants
    targetData.meshes.forEach(mesh => {
      mesh.primitives.forEach(primitive => {
        // Update main material reference
        if (primitive.material !== undefined) {
          const newIndex = materialIndexMapping.get(primitive.material);
          if (newIndex !== undefined) {
            primitive.material = newIndex;
          }
        }

        // Update variant mappings
        updateVariantMappings(primitive, materialIndexMapping);
      });
    });

    // Assign the reordered materials and other assets
    targetData.materials = orderedMaterials;
    targetData.textures = referenceData.textures;
    targetData.images = referenceData.images;
    targetData.samplers = targetData.samplers || [];

    progressCallback(0.6);

    // Apply mood rotation if needed
    if (applyMoodRotationFlag) {
      const isBlavalen = materialData.models?.['Blavalen']?.includes(model) || false;
      applyMoodRotation(targetData, isBlavalen);
    }

    progressCallback(0.8);

    // Apply variants if needed
    if (applyVariantsFlag) {
      applyVariants(targetData, materialData);
    }

    progressCallback(1);

    // Create the final blob
    const updatedBlob = new Blob([JSON.stringify(targetData, null, 2)], { type: 'application/json' });
    return await updatedBlob.arrayBuffer();
  } catch (error) {
    console.error(`Error in updateMaterials for target file ${targetFileName}:`, error);
    throw error;
  }
}

function collectUsedAssets(data: GltfData, variantIndex: number) {
  const usedMaterials = new Set<number>();
  const usedTextures = new Set<number>();
  const usedImages = new Set<number>();

  data.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      if (primitive.material !== undefined) {
        usedMaterials.add(primitive.material);
      }
      if (primitive.extensions?.KHR_materials_variants) {
        const variantMapping = primitive.extensions.KHR_materials_variants.mappings.find(
          (mapping) => mapping.variants.includes(variantIndex)
        );
        if (variantMapping) {
          usedMaterials.add(variantMapping.material);
        }
      }
    });
  });

  usedMaterials.forEach((materialIndex) => {
    const material = data.materials[materialIndex];
    const processTexture = (textureInfo: any) => {
      if (textureInfo && textureInfo.index !== undefined) {
        usedTextures.add(textureInfo.index);
        const texture = data.textures[textureInfo.index];
        if (texture.source !== undefined) {
          usedImages.add(texture.source);
        }
      }
    };

    if (material.pbrMetallicRoughness) {
      processTexture(material.pbrMetallicRoughness.baseColorTexture);
      processTexture(material.pbrMetallicRoughness.metallicRoughnessTexture);
    }
    processTexture(material.normalTexture);
    processTexture(material.occlusionTexture);
    processTexture(material.emissiveTexture);
    if (material.extensions?.KHR_materials_sheen) {
      processTexture(material.extensions.KHR_materials_sheen.sheenColorTexture);
      processTexture(material.extensions.KHR_materials_sheen.sheenRoughnessTexture);
    }
  });

  return { usedMaterials, usedTextures, usedImages };
}

export async function exportIndividualVariants(
  jsonData: GltfData,
  fileName: string,
  model: string,
  applyMoodRotationFlag: boolean,
  materialData: MaterialData,
  progressCallback: (progress: number) => void
): Promise<{ exportedVariants: ExportedVariant[] }> {
  if (!materialData) {
    throw new Error("Material JSON data is missing. Please upload a valid Materials.json file.");
  }

  const orderedVariants = getOrderedVariants(materialData.meshAssignments);
  const exportedVariants: ExportedVariant[] = [];
  const variants = jsonData.extensions?.KHR_materials_variants?.variants || [];
  const totalVariants = variants.length;

  try {
    // Process variants in the determined order
    for (let i = 0; i < orderedVariants.length; i++) {
      const variantName = orderedVariants[i];
      const variantIndex = variants.findIndex(v => v.name === variantName);
      
      if (variantIndex === -1) continue;

      let variantData: GltfData = cloneDeep(jsonData);

      // Apply the variant as the default material
      variantData.meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
          if (primitive.extensions?.KHR_materials_variants) {
            const variantMapping = primitive.extensions.KHR_materials_variants.mappings.find(
              (mapping) => mapping.variants.includes(variantIndex)
            );
            if (variantMapping) {
              primitive.material = variantMapping.material;
            }
          }
        });
      });

      // Collect used assets
      const { usedMaterials, usedTextures, usedImages } = collectUsedAssets(variantData, variantIndex);

      // Create new arrays for materials, textures, and images
      const newMaterials = Array.from(usedMaterials).map((index) => variantData.materials[index]);
      const newTextures = Array.from(usedTextures).map((index) => variantData.textures[index]);
      const newImages = Array.from(usedImages).map((index) => variantData.images[index]);

      // Create mapping for updating indices
      const materialMap = new Map(Array.from(usedMaterials).map((oldIndex, newIndex) => [oldIndex, newIndex]));
      const textureMap = new Map(Array.from(usedTextures).map((oldIndex, newIndex) => [oldIndex, newIndex]));
      const imageMap = new Map(Array.from(usedImages).map((oldIndex, newIndex) => [oldIndex, newIndex]));

      // Update material references in meshes
      variantData.meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
          if (primitive.material !== undefined) {
            primitive.material = materialMap.get(primitive.material) ?? primitive.material;
          }
        });
      });

      // Update texture references in materials
      newMaterials.forEach((material) => {
        const updateTextureIndex = (textureInfo: any) => {
          if (textureInfo && textureInfo.index !== undefined) {
            textureInfo.index = textureMap.get(textureInfo.index) ?? textureInfo.index;
          }
        };

        if (material.pbrMetallicRoughness) {
          updateTextureIndex(material.pbrMetallicRoughness.baseColorTexture);
          updateTextureIndex(material.pbrMetallicRoughness.metallicRoughnessTexture);
        }
        updateTextureIndex(material.normalTexture);
        updateTextureIndex(material.occlusionTexture);
        updateTextureIndex(material.emissiveTexture);
        if (material.extensions?.KHR_materials_sheen) {
          updateTextureIndex(material.extensions.KHR_materials_sheen.sheenColorTexture);
          updateTextureIndex(material.extensions.KHR_materials_sheen.sheenRoughnessTexture);
        }
      });

      // Update image references in textures
      newTextures.forEach((texture) => {
        if (texture.source !== undefined) {
          texture.source = imageMap.get(texture.source) ?? texture.source;
        }
      });

      // Replace the arrays in variantData
      variantData.materials = newMaterials;
      variantData.textures = newTextures;
      variantData.images = newImages;

      // Remove KHR_materials_variants extension
      delete variantData.extensions?.KHR_materials_variants;
      variantData.meshes.forEach((mesh) => {
        mesh.primitives.forEach((primitive) => {
          delete primitive.extensions?.KHR_materials_variants;
        });
      });

      if (applyMoodRotationFlag) {
        const isBlavalen = materialData.models?.['Blavalen']?.includes(model) || false;
        applyMoodRotation(variantData, isBlavalen);
      }

      const variantFileName = `${fileName.replace('.gltf', '')}${variantName}.gltf`;
      const variantBlob = new Blob([JSON.stringify(variantData, null, 2)], { type: 'application/json' });
      const arrayBuffer = await variantBlob.arrayBuffer();

      exportedVariants.push({ fileName: variantFileName, content: arrayBuffer });

      progressCallback((i + 1) / totalVariants);
    }

    return { exportedVariants };
  } catch (error) {
    console.error("Error in exportIndividualVariants:", error);
    throw error;
  }
}