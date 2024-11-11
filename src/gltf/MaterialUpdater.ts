// src/gltf/MaterialUpdater.ts

import { MaterialData, GltfData, ExportedVariant, GltfMaterial, GltfMesh, GltfTexture, GltfImage, MeshAssignment } from '@/gltf/gltfTypes';
import { cloneDeep } from 'lodash';

// First, define some helper interfaces for AO assets
interface AOAssets {
  aoImages: GltfImage[];
  aoTextures: GltfTexture[];
  aoImageIndices: number[];
  aoTextureIndices: number[];
}

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

// Helper function to check for AO texture
function isAOTexture(texture: GltfTexture | undefined, images: GltfImage[]): boolean {
  if (!texture || texture.source === undefined) return false;
  if (!Array.isArray(images) || !images[texture.source]) return false;
  const image = images[texture.source];
  if (!image || !image.name) return false;
  return image.name.endsWith('_AO');
}

// Helper function to identify and preserve AO textures from target data
function preserveAOTextures(
  targetData: GltfData,
  referenceData: GltfData
): {
  targetAOTextureMap: Map<string, { textureIndex: number; imageIndex: number }>;
} {
  const targetAOTextureMap = new Map<string, { textureIndex: number; imageIndex: number }>();

  // Find AO textures in target file and map them to material names
  targetData.materials.forEach((material, materialIndex) => {
    if (material.occlusionTexture) {
      const textureIndex = material.occlusionTexture.index;
      if (textureIndex !== undefined) {
        const texture = targetData.textures[textureIndex];
        if (isAOTexture(texture, targetData.images) && texture.source !== undefined) {
          targetAOTextureMap.set(material.name, {
            textureIndex: textureIndex,
            imageIndex: texture.source
          });
        }
      }
    }
  });

  return { targetAOTextureMap };
}

// Helper function to handle AO texture replacement
function handleAOTextures(
  targetData: GltfData,
  referenceData: GltfData
): {
  updatedTextures: GltfTexture[];
  updatedImages: GltfImage[];
  textureIndexMap: Map<number, number>;
} {
  const textureIndexMap = new Map<number, number>();
  const updatedTextures = [...referenceData.textures];
  const updatedImages = [...referenceData.images];

  // First, identify all AO textures in both files
  targetData.materials.forEach((targetMaterial) => {
    if (!targetMaterial.occlusionTexture) return;

    const refMaterial = referenceData.materials.find(m => m.name === targetMaterial.name);
    if (!refMaterial || !refMaterial.occlusionTexture) return;

    const targetTextureIndex = targetMaterial.occlusionTexture.index;
    const refTextureIndex = refMaterial.occlusionTexture.index;

    if (targetTextureIndex === undefined || refTextureIndex === undefined) return;

    const targetTexture = targetData.textures[targetTextureIndex];
    const refTexture = referenceData.textures[refTextureIndex];

    if (!isAOTexture(targetTexture, targetData.images) || !isAOTexture(refTexture, referenceData.images)) return;

    if (targetTexture.source !== undefined && refTexture.source !== undefined) {
      // Replace the reference AO image with the target AO image
      updatedImages[refTexture.source] = targetData.images[targetTexture.source];
      
      // Update the texture to maintain the same sampler but point to the replaced image
      updatedTextures[refTextureIndex] = {
        ...refTexture,
        source: refTexture.source // Keep the same image index since we replaced the image
      };

      // Map the target texture index to the reference texture index
      textureIndexMap.set(targetTextureIndex, refTextureIndex);
    }
  });

  return {
    updatedTextures,
    updatedImages,
    textureIndexMap
  };
}

// Update the mapping function to handle both string and number indices
function updateVariantMappings(
  primitive: any,
  materialIndexMapping: Map<number | string, number>
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
  
  if (assignment.defaultMaterial && !materialNames.has(assignment.defaultMaterial)) {
    console.warn(`Invalid default material "${assignment.defaultMaterial}" for mesh "${meshName}"`);
    return false;
  }

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

// Add new validation helper
function validateMeshAssignment(
  meshName: string,
  assignment: MeshAssignment,
  materials: GltfMaterial[],
  variants: Array<{ name: string }>
): boolean {
  const materialNames = new Set(materials.map(m => m.name));
  const variantNames = new Set(variants.map(v => v.name));
  
  // Check default material
  if (assignment.defaultMaterial && !materialNames.has(assignment.defaultMaterial)) {
    console.warn(`Invalid default material "${assignment.defaultMaterial}" for mesh "${meshName}"`);
    return false;
  }

  // Check variants
  for (const variant of assignment.variants) {
    if (!materialNames.has(variant.material)) {
      console.warn(`Invalid variant material "${variant.material}" for mesh "${meshName}"`);
      return false;
    }
    if (!variantNames.has(variant.name)) {
      console.warn(`Invalid variant name "${variant.name}" for mesh "${meshName}"`);
      return false;
    }
  }

  return true;
}

function applyVariants(targetData: GltfData, materialData: MaterialData) {
  console.log('Starting variant application...');
  
  if (!targetData.extensions) targetData.extensions = {};
  if (!targetData.extensions.KHR_materials_variants) {
    targetData.extensions.KHR_materials_variants = { variants: [] };
  }

  // Get ordered variants
  const orderedVariants = getOrderedVariants(materialData.meshAssignments);
  console.log('Ordered variants:', orderedVariants);
  
  // Only add variants extension if we actually have variants
  if (orderedVariants.length > 0) {
    targetData.extensions.KHR_materials_variants.variants = 
      orderedVariants.map(name => ({ name }));

    // Make sure extensionsUsed includes variants extension
    if (!targetData.extensionsUsed) {
      targetData.extensionsUsed = [];
    }
    if (!targetData.extensionsUsed.includes('KHR_materials_variants')) {
      targetData.extensionsUsed.push('KHR_materials_variants');
    }
  } else {
    // Remove variants extension if no variants exist
    delete targetData.extensions.KHR_materials_variants;
  }

  // Create material name to index mapping
  const materialNameToIndex = new Map(
    targetData.materials.map((material, index) => [material.name, index])
  );

  // Create variant name to index mapping
  const variantNameToIndex = new Map(
    orderedVariants.map((name, index) => [name, index])
  );

  // Apply material assignments to meshes
  targetData.meshes.forEach((mesh: GltfMesh) => {
    const meshAssignment = materialData.meshAssignments[mesh.name];
    
    // Clear existing variant extensions from all primitives first
    mesh.primitives.forEach(primitive => {
      if (primitive.extensions?.KHR_materials_variants) {
        delete primitive.extensions.KHR_materials_variants;
      }
      
      // Clean up empty extensions object
      if (primitive.extensions && Object.keys(primitive.extensions).length === 0) {
        delete primitive.extensions;
      }
    });

    // If no assignment exists for this mesh, keep original material and skip variants
    if (!meshAssignment) {
      console.log(`No assignment found for mesh "${mesh.name}", keeping original material`);
      return;
    }

    console.log(`Processing mesh "${mesh.name}"...`);
    console.log('Assignment:', meshAssignment);

    mesh.primitives.forEach((primitive, primitiveIndex) => {
      // Set default material if specified
      if (meshAssignment.defaultMaterial) {
        const defaultMaterialIndex = materialNameToIndex.get(meshAssignment.defaultMaterial);
        if (defaultMaterialIndex !== undefined) {
          primitive.material = defaultMaterialIndex;
          console.log(`Set default material for ${mesh.name} primitive ${primitiveIndex} to ${meshAssignment.defaultMaterial} (index: ${defaultMaterialIndex})`);
        } else {
          console.warn(`Default material "${meshAssignment.defaultMaterial}" not found for mesh "${mesh.name}"`);
        }
      }

      // Only add variants if they exist for this mesh
      if (meshAssignment.variants && meshAssignment.variants.length > 0) {
        // Sort variants to match the global order
        const sortedVariants = meshAssignment.variants
          .sort((a, b) => {
            const indexA = orderedVariants.indexOf(a.name);
            const indexB = orderedVariants.indexOf(b.name);
            return indexA - indexB;
          })
          .filter(variant => {
            // Filter out invalid variants
            const materialIndex = materialNameToIndex.get(variant.material);
            const variantIndex = variantNameToIndex.get(variant.name);
            return materialIndex !== undefined && variantIndex !== undefined;
          });

        // Only add variant extension if we have valid variants
        if (sortedVariants.length > 0) {
          if (!primitive.extensions) {
            primitive.extensions = {};
          }

          const mappings = sortedVariants.map(variant => {
            const materialIndex = materialNameToIndex.get(variant.material);
            const variantIndex = variantNameToIndex.get(variant.name);
            return {
              material: materialIndex!,
              variants: [variantIndex!]
            };
          });

          // Only add variants extension if we have valid mappings
          if (mappings.length > 0) {
            primitive.extensions.KHR_materials_variants = {
              mappings: mappings
            };
            console.log(`Added ${mappings.length} variant mappings for ${mesh.name} primitive ${primitiveIndex}`);
          }
        }
      }

      // Clean up empty extensions
      if (primitive.extensions && Object.keys(primitive.extensions).length === 0) {
        delete primitive.extensions;
      }
    });
  });

  // Clean up global extensions if no meshes use variants
  const anyMeshHasVariants = targetData.meshes.some(mesh => 
    mesh.primitives.some(primitive => 
      primitive.extensions?.KHR_materials_variants
    )
  );

  if (!anyMeshHasVariants) {
    delete targetData.extensions.KHR_materials_variants;
    if (targetData.extensionsUsed) {
      const index = targetData.extensionsUsed.indexOf('KHR_materials_variants');
      if (index !== -1) {
        targetData.extensionsUsed.splice(index, 1);
      }
    }
  }

  // Clean up empty extensions object at root level
  if (targetData.extensions && Object.keys(targetData.extensions).length === 0) {
    delete targetData.extensions;
  }

  console.log('Variant application completed');
}

// Update the applyMoodRotation function with proper checks
function applyMoodRotation(targetData: GltfData, isBlavalen: boolean) {
  if (!targetData.materials || !Array.isArray(targetData.materials)) return;

  targetData.materials.forEach((material: GltfMaterial) => {
    if (!material.name?.startsWith('MOO-')) return;

    const rotation = isBlavalen ? 0 : 1.56;
    const applyRotation = (textureInfo: any) => {
      // Add explicit checks for texture info and extensions
      if (!textureInfo || !textureInfo.extensions || !textureInfo.extensions.KHR_texture_transform) {
        return;
      }

      // Only proceed if we have a valid texture index
      if (textureInfo.index === undefined || !targetData.textures) {
        return;
      }

      // Make sure we have a valid texture at this index
      const texture = targetData.textures[textureInfo.index];
      if (!texture) return;

      // Check if it's an AO texture
      const isAO = isAOTexture(texture, targetData.images || []);
      if (!isAO) {
        textureInfo.extensions.KHR_texture_transform.rotation = rotation;
      }
    };

    // Add null checks before applying rotation
    if (material.normalTexture) {
      applyRotation(material.normalTexture);
    }
    if (material.pbrMetallicRoughness?.baseColorTexture) {
      applyRotation(material.pbrMetallicRoughness.baseColorTexture);
    }
    if (material.extensions?.KHR_materials_sheen?.sheenColorTexture) {
      applyRotation(material.extensions.KHR_materials_sheen.sheenColorTexture);
    }
  });
}

// New helper function to sort and reorganize textures and images to prioritize AO
function reorganizeAssetsForAO(targetData: GltfData): {
  reorderedImages: GltfImage[];
  reorderedTextures: GltfTexture[];
  imageIndexMap: Map<number, number>;
  textureIndexMap: Map<number, number>;
} {
  const reorderedImages: GltfImage[] = [];
  const reorderedTextures: GltfTexture[] = [];
  const imageIndexMap = new Map<number, number>();
  const textureIndexMap = new Map<number, number>();

  // First, find all AO images and their corresponding textures
  const aoImageIndices: number[] = [];
  const aoTextureIndices: number[] = [];
  
  targetData.textures.forEach((texture, textureIndex) => {
    if (texture.source !== undefined && 
        targetData.images[texture.source]?.name?.endsWith('_AO')) {
      aoImageIndices.push(texture.source);
      aoTextureIndices.push(textureIndex);
    }
  });

  // Add AO images first
  aoImageIndices.forEach((oldIndex) => {
    const newIndex = reorderedImages.length;
    imageIndexMap.set(oldIndex, newIndex);
    reorderedImages.push(targetData.images[oldIndex]);
  });

  // Add remaining images
  targetData.images.forEach((image, index) => {
    if (!aoImageIndices.includes(index)) {
      const newIndex = reorderedImages.length;
      imageIndexMap.set(index, newIndex);
      reorderedImages.push(image);
    }
  });

  // Add AO textures first, updating their source indices
  aoTextureIndices.forEach((oldIndex) => {
    const texture = {...targetData.textures[oldIndex]};
    if (texture.source !== undefined) {
      texture.source = imageIndexMap.get(texture.source) ?? texture.source;
    }
    const newIndex = reorderedTextures.length;
    textureIndexMap.set(oldIndex, newIndex);
    reorderedTextures.push(texture);
  });

  // Add remaining textures
  targetData.textures.forEach((texture, index) => {
    if (!aoTextureIndices.includes(index)) {
      const newTexture = {...texture};
      if (newTexture.source !== undefined) {
        newTexture.source = imageIndexMap.get(newTexture.source) ?? newTexture.source;
      }
      const newIndex = reorderedTextures.length;
      textureIndexMap.set(index, newIndex);
      reorderedTextures.push(newTexture);
    }
  });

  return {
    reorderedImages,
    reorderedTextures,
    imageIndexMap,
    textureIndexMap
  };
}

// Helper function to get AO assets from target
function getAOAssetsFromTarget(targetData: GltfData): AOAssets {
  const aoAssets: AOAssets = {
    aoImages: [],
    aoTextures: [],
    aoImageIndices: [],
    aoTextureIndices: []
  };

  targetData.textures?.forEach((texture, textureIndex) => {
    if (texture.source !== undefined && 
        targetData.images?.[texture.source]?.name?.endsWith('_AO')) {
      aoAssets.aoImageIndices.push(texture.source);
      aoAssets.aoTextureIndices.push(textureIndex);
      if (targetData.images) {
        aoAssets.aoImages.push(targetData.images[texture.source]);
        aoAssets.aoTextures.push(texture);
      }
    }
  });

  return aoAssets;
}

// Helper function to merge assets
function mergeAssets(
  referenceData: GltfData,
  targetData: GltfData
): {
  mergedImages: GltfImage[];
  mergedTextures: GltfTexture[];
  imageIndexMap: Map<number, number>;
  textureIndexMap: Map<number, number>;
} {
  const mergedImages: GltfImage[] = [];
  const mergedTextures: GltfTexture[] = [];
  const imageIndexMap = new Map<number, number>();
  const textureIndexMap = new Map<number, number>();

  // Get AO assets from target
  const aoAssets = getAOAssetsFromTarget(targetData);

  // Add target AO images first
  aoAssets.aoImages.forEach((image, index) => {
    const newIndex = mergedImages.length;
    imageIndexMap.set(aoAssets.aoImageIndices[index], newIndex);
    mergedImages.push(image);
  });

  // Add target AO textures
  aoAssets.aoTextures.forEach((texture, index) => {
    const newTexture = { ...texture };
    if (newTexture.source !== undefined) {
      newTexture.source = imageIndexMap.get(texture.source) ?? texture.source;
    }
    const newIndex = mergedTextures.length;
    textureIndexMap.set(aoAssets.aoTextureIndices[index], newIndex);
    mergedTextures.push(newTexture);
  });

  // Add reference images (excluding AO images)
  referenceData.images?.forEach((image, oldIndex) => {
    // Skip reference AO images
    if (image.name?.endsWith('_AO')) return;
    
    const newIndex = mergedImages.length;
    imageIndexMap.set(oldIndex, newIndex);
    mergedImages.push(image);
  });

  // Add reference textures (excluding AO textures)
  referenceData.textures?.forEach((texture, oldIndex) => {
    // Skip reference AO textures
    if (texture.source !== undefined && 
        referenceData.images?.[texture.source]?.name?.endsWith('_AO')) {
      return;
    }

    const newTexture = { ...texture };
    if (newTexture.source !== undefined) {
      newTexture.source = imageIndexMap.get(newTexture.source) ?? newTexture.source;
    }
    const newIndex = mergedTextures.length;
    textureIndexMap.set(oldIndex, newIndex);
    mergedTextures.push(newTexture);
  });

  return {
    mergedImages,
    mergedTextures,
    imageIndexMap,
    textureIndexMap
  };
}

// Update material texture references function
function updateMaterialTextureRefs(
  material: GltfMaterial,
  textureIndexMap: Map<number, number>,
  targetData: GltfData,
  mergedTextures: GltfTexture[],
  mergedImages: GltfImage[]
): void {
  const updateTextureRef = (textureRef: any) => {
    if (!textureRef || textureRef.index === undefined) return;

    // If this is referencing an AO texture in the target, find the corresponding new AO texture
    const isTargetAO = textureRef.index !== undefined && 
                      targetData.textures && 
                      isAOTexture(targetData.textures[textureRef.index], targetData.images || []);

    if (isTargetAO) {
      // Find the new AO texture index in merged textures
      const newAOIndex = mergedTextures.findIndex(tex => 
        tex.source !== undefined && 
        mergedImages[tex.source]?.name?.endsWith('_AO')
      );
      if (newAOIndex !== -1) {
        textureRef.index = newAOIndex;
        return;
      }
    }

    // For non-AO textures, use the regular mapping
    textureRef.index = textureIndexMap.get(textureRef.index) ?? textureRef.index;
  };

  if (material.pbrMetallicRoughness) {
    updateTextureRef(material.pbrMetallicRoughness.baseColorTexture);
    updateTextureRef(material.pbrMetallicRoughness.metallicRoughnessTexture);
  }
  updateTextureRef(material.normalTexture);
  updateTextureRef(material.occlusionTexture);
  updateTextureRef(material.emissiveTexture);
  if (material.extensions?.KHR_materials_sheen) {
    updateTextureRef(material.extensions.KHR_materials_sheen.sheenColorTexture);
    updateTextureRef(material.extensions.KHR_materials_sheen.sheenRoughnessTexture);
  }
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
    // Initialize arrays if they don't exist
    targetData.materials = targetData.materials || [];
    targetData.textures = targetData.textures || [];
    targetData.images = targetData.images || [];
    targetData.samplers = targetData.samplers || [];
    targetData.meshes = targetData.meshes || [];
    targetData.extensionsUsed = targetData.extensionsUsed || [];
    targetData.extensionsRequired = targetData.extensionsRequired || [];

    // Get AO assets from target
    const aoAssets = getAOAssetsFromTarget(targetData);

    // Merge assets from reference and target
    const {
      mergedImages,
      mergedTextures,
      imageIndexMap,
      textureIndexMap
    } = mergeAssets(referenceData, targetData);

    // Update target data with merged assets
    targetData.images = mergedImages;
    targetData.textures = mergedTextures;
    targetData.samplers = referenceData.samplers || [];

    // Copy extensions from reference
    targetData.extensions = referenceData.extensions || {};

    progressCallback(0.2);

    // Create ordered materials array based on materialData
    const orderedMaterials: GltfMaterial[] = [];
    const materialNameToNewIndex = new Map<string | number, number>();

    // Add materials in the order specified in materialData
    materialData.materials.forEach((jsonMaterial, index) => {
      const refMaterial = referenceData.materials?.find(m => m.name === jsonMaterial.name);
      if (refMaterial) {
        const material = cloneDeep(refMaterial);
        // Update texture references in the material
        const updateTextureRef = (textureRef: any) => {
          if (textureRef && textureRef.index !== undefined) {
            textureRef.index = textureIndexMap.get(textureRef.index) ?? textureRef.index;
          }
        };

        if (material.pbrMetallicRoughness) {
          updateTextureRef(material.pbrMetallicRoughness.baseColorTexture);
          updateTextureRef(material.pbrMetallicRoughness.metallicRoughnessTexture);
        }
        updateTextureRef(material.normalTexture);
        updateTextureRef(material.occlusionTexture);
        updateTextureRef(material.emissiveTexture);
        if (material.extensions?.KHR_materials_sheen) {
          updateTextureRef(material.extensions.KHR_materials_sheen.sheenColorTexture);
          updateTextureRef(material.extensions.KHR_materials_sheen.sheenRoughnessTexture);
        }

        orderedMaterials.push(material);
        materialNameToNewIndex.set(jsonMaterial.name, index);
      }
    });

    // Add remaining materials from reference
    referenceData.materials?.forEach((material, oldIndex) => {
      if (!materialNameToNewIndex.has(material.name)) {
        materialNameToNewIndex.set(material.name, orderedMaterials.length);
        materialNameToNewIndex.set(oldIndex, orderedMaterials.length);
        const clonedMaterial = cloneDeep(material);
        orderedMaterials.push(clonedMaterial);
      }
    });

    progressCallback(0.4);

    // Update material references in meshes
    targetData.meshes?.forEach(mesh => {
      if (mesh.primitives) {
        mesh.primitives.forEach(primitive => {
          if (primitive.material !== undefined) {
            const newIndex = materialNameToNewIndex.get(primitive.material);
            if (newIndex !== undefined) {
              primitive.material = newIndex;
            }
          }
          if (primitive.extensions?.KHR_materials_variants) {
            updateVariantMappings(primitive, materialNameToNewIndex);
          }
        });
      }
    });

    // Assign the final materials array
    targetData.materials = orderedMaterials;

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

    // Create final blob
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