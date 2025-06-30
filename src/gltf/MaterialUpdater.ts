// src/gltf/MaterialUpdater.ts

import { MaterialData, GltfData, ExportedVariant, GltfMaterial, GltfMesh, GltfTexture, GltfImage, MeshAssignment, MeshGroup } from '@/gltf/gltfTypes';
import { cloneDeep } from 'lodash';

// Helper function to get mesh assignments with group priority
function getMeshAssignmentsWithGroupPriority(
  materialData: MaterialData,
  fileName: string
): { [meshName: string]: MeshAssignment } {
  const result = { ...materialData.meshAssignments };
  
  // Check if this filename matches any group
  if (materialData.meshGroups) {
    Object.values(materialData.meshGroups).forEach(group => {
      // Check if this filename matches any of the group's filenames
      const fileNameWithoutExtension = fileName.replace(/\.(gltf|glb)$/i, '');
      const isMatch = group.filenames.some(groupFilename => {
        const groupFileNameWithoutExtension = groupFilename.replace(/\.(gltf|glb)$/i, '');
        return fileNameWithoutExtension === groupFileNameWithoutExtension ||
               fileName === groupFilename ||
               fileNameWithoutExtension.includes(groupFileNameWithoutExtension) ||
               groupFileNameWithoutExtension.includes(fileNameWithoutExtension);
      });

      if (isMatch) {
        console.log(`File "${fileName}" matches group "${group.name}"`);
        // Add group meshes to the result, they take priority over regular meshes
        Object.entries(group.meshes).forEach(([meshName, assignment]) => {
          result[meshName] = assignment;
          console.log(`  Added mesh "${meshName}" from group`);
        });
      }
    });
  }

  return result;
}

// Helper function to get ordered variants with group priority
function getOrderedVariantsWithGroupPriority(
  materialData: MaterialData,
  fileName: string
): string[] {
  const meshAssignments = getMeshAssignmentsWithGroupPriority(materialData, fileName);
  
  const variants = new Map<string, Set<string>>();
  const meshToVariants = new Map<string, string[]>();

  // Collect all unique variants and their materials
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

// Helper function to ensure required extensions are present
function ensureExtensions(targetData: GltfData) {
  if (!targetData.extensionsUsed) {
    targetData.extensionsUsed = [];
  }
  if (!targetData.extensionsRequired) {
    targetData.extensionsRequired = [];
  }

  const requiredExtensions = ['KHR_texture_transform', 'KHR_materials_variants'];
  const usedExtensions = ['KHR_texture_transform', 'KHR_materials_variants'];

  usedExtensions.forEach(ext => {
    if (!targetData.extensionsUsed!.includes(ext)) {
      targetData.extensionsUsed!.push(ext);
    }
  });

  if (!targetData.extensionsRequired!.includes('KHR_texture_transform')) {
    targetData.extensionsRequired!.push('KHR_texture_transform');
  }

  console.log('Extensions ensured:', {
    extensionsUsed: targetData.extensionsUsed,
    extensionsRequired: targetData.extensionsRequired
  });
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

// Helper function to determine if a texture is an AO texture
function isAOTexture(texture: GltfTexture, images: GltfImage[]): boolean {
  if (!texture.source && texture.source !== 0) return false;
  const image = images[texture.source];
  if (!image || !image.name) return false;
  
  const imageName = image.name.toLowerCase();
  return imageName.includes('_ao') || imageName.includes('ambientocclusion');
}

// Helper function to find the AO image in target file
function findTargetAOImage(targetData: GltfData): number | null {
  const aoImageIndex = targetData.images.findIndex(img => 
    img.name && (
      img.name.includes('_AO') ||
      img.name.includes('-') && img.name.endsWith('_AO')
    )
  );
  
  console.log('Target AO Image found:', aoImageIndex, aoImageIndex !== -1 ? targetData.images[aoImageIndex].name : 'not found');
  return aoImageIndex !== -1 ? aoImageIndex : null;
}

// Helper function to find AO texture in reference file
function findReferenceAOTexture(referenceData: GltfData): number | null {
  const aoTextureIndex = referenceData.textures.findIndex(tex => 
    tex.name && tex.name.includes('tex_AmbientOcclusion_A')
  );
  
  console.log('Reference AO Texture found:', aoTextureIndex, aoTextureIndex !== -1 ? referenceData.textures[aoTextureIndex].name : 'not found');
  return aoTextureIndex !== -1 ? aoTextureIndex : null;
}

// Helper function to handle AO texture preservation
function handleAOTextures(
  targetData: GltfData,
  referenceData: GltfData
): {
  updatedTextures: GltfTexture[];
  updatedImages: GltfImage[];
} {
  const targetAOImageIndex = findTargetAOImage(targetData);
  if (targetAOImageIndex === null) {
    throw new Error('No AO image found in target file');
  }

  const refAOTextureIndex = findReferenceAOTexture(referenceData);
  if (refAOTextureIndex === null) {
    throw new Error('No AO texture found in reference file');
  }

  const updatedTextures = [...referenceData.textures];
  const updatedImages = [...referenceData.images];

  const targetAOImage = targetData.images[targetAOImageIndex];
  const refAOTexture = referenceData.textures[refAOTextureIndex];
  
  if (refAOTexture.source === undefined) {
    throw new Error('Reference AO texture has no source image');
  }

  updatedImages[refAOTexture.source] = targetAOImage;

  updatedTextures[refAOTextureIndex] = {
    ...refAOTexture,
    source: refAOTexture.source
  };

  console.log('AO Texture Update:', {
    targetAOImageIndex,
    refAOTextureIndex,
    refAOImageSource: refAOTexture.source,
    targetAOImageName: targetAOImage.name,
  });

  return {
    updatedTextures,
    updatedImages
  };
}

// Helper function to update variant mappings
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

// Modified applyVariants function to use group priority
function applyVariants(targetData: GltfData, materialData: MaterialData, fileName: string) {
  console.log(`Starting variant application for file: ${fileName}...`);
  
  if (!targetData.extensions) targetData.extensions = {};
  if (!targetData.extensions.KHR_materials_variants) {
    targetData.extensions.KHR_materials_variants = { variants: [] };
  }

  // Get mesh assignments with group priority
  const meshAssignments = getMeshAssignmentsWithGroupPriority(materialData, fileName);
  console.log(`Using mesh assignments for ${fileName}:`, Object.keys(meshAssignments));

  // Get ordered variants
  const orderedVariants = getOrderedVariantsWithGroupPriority(materialData, fileName);
  console.log('Ordered variants:', orderedVariants);
  
  // Only add variants extension if we actually have variants
  if (orderedVariants.length > 0) {
    targetData.extensions.KHR_materials_variants.variants = 
      orderedVariants.map(name => ({ name }));

    if (!targetData.extensionsUsed) {
      targetData.extensionsUsed = [];
    }
    if (!targetData.extensionsUsed.includes('KHR_materials_variants')) {
      targetData.extensionsUsed.push('KHR_materials_variants');
    }
  } else {
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
    const meshAssignment = meshAssignments[mesh.name];
    
    // Clear existing variant extensions from all primitives first
    mesh.primitives.forEach(primitive => {
      if (primitive.extensions?.KHR_materials_variants) {
        delete primitive.extensions.KHR_materials_variants;
      }
      
      if (primitive.extensions && Object.keys(primitive.extensions).length === 0) {
        delete primitive.extensions;
      }
    });

    // If no assignment exists for this mesh, keep original material and skip variants
    if (!meshAssignment) {
      console.log(`No assignment found for mesh "${mesh.name}", keeping original material`);
      return;
    }

    console.log(`Processing mesh "${mesh.name}" with group priority...`);
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
        const sortedVariants = meshAssignment.variants
          .sort((a, b) => {
            const indexA = orderedVariants.indexOf(a.name);
            const indexB = orderedVariants.indexOf(b.name);
            return indexA - indexB;
          })
          .filter(variant => {
            const materialIndex = materialNameToIndex.get(variant.material);
            const variantIndex = variantNameToIndex.get(variant.name);
            return materialIndex !== undefined && variantIndex !== undefined;
          });

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

          if (mappings.length > 0) {
            primitive.extensions.KHR_materials_variants = {
              mappings: mappings
            };
            console.log(`Added ${mappings.length} variant mappings for ${mesh.name} primitive ${primitiveIndex}`);
          }
        }
      }

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

  if (targetData.extensions && Object.keys(targetData.extensions).length === 0) {
    delete targetData.extensions;
  }

  console.log(`Variant application completed for ${fileName}`);
}

// Update applyMoodRotation to preserve AO textures
function applyMoodRotation(targetData: GltfData, isBlavalen: boolean) {
  targetData.materials.forEach((material: GltfMaterial) => {
    if (material.name.startsWith('MOO-')) {
      const rotation = isBlavalen ? 0 : 1.56;
      const applyRotation = (texture: any) => {
        if (texture && texture.extensions && texture.extensions.KHR_texture_transform) {
          const isAO = isAOTexture(targetData.textures[texture.index], targetData.images);
          if (!isAO) {
            texture.extensions.KHR_texture_transform.rotation = rotation;
          }
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
    // Initialize arrays if they don't exist in target data
    targetData.materials = targetData.materials || [];
    targetData.textures = targetData.textures || [];
    targetData.images = targetData.images || [];
    targetData.samplers = targetData.samplers || [];
    targetData.meshes = targetData.meshes || [];
    targetData.extensionsUsed = targetData.extensionsUsed || [];
    targetData.extensionsRequired = targetData.extensionsRequired || [];

    // Ensure required extensions are present
    ensureExtensions(targetData);

    // Handle AO texture replacement
    const {
      updatedTextures,
      updatedImages
    } = handleAOTextures(targetData, referenceData);

    // Copy extensions from reference
    targetData.extensions = referenceData.extensions || {};

    progressCallback(0.2);

    // Create ordered materials array based on materialData
    const orderedMaterials: GltfMaterial[] = [];
    const materialNameToNewIndex = new Map<string | number, number>();

    // Add materials in the order specified in materialData
    materialData.materials.forEach((jsonMaterial, index) => {
      const refMaterial = referenceData.materials.find(m => m.name === jsonMaterial.name);
      if (refMaterial) {
        const material = cloneDeep(refMaterial);
        orderedMaterials.push(material);
        materialNameToNewIndex.set(jsonMaterial.name, index);
      }
    });

    // Add remaining materials from reference
    referenceData.materials.forEach((material, oldIndex) => {
      if (!materialNameToNewIndex.has(material.name)) {
        materialNameToNewIndex.set(material.name, orderedMaterials.length);
        materialNameToNewIndex.set(oldIndex, orderedMaterials.length);
        orderedMaterials.push(cloneDeep(material));
      }
    });

    progressCallback(0.4);

    // Update material references in meshes
    if (targetData.meshes && targetData.meshes.length > 0) {
      targetData.meshes.forEach(mesh => {
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
    }

    // Assign the updated assets
    targetData.materials = orderedMaterials;
    targetData.textures = updatedTextures;
    targetData.images = updatedImages;
    targetData.samplers = referenceData.samplers;

    progressCallback(0.6);

    // Apply mood rotation if needed
    if (applyMoodRotationFlag) {
      const isBlavalen = materialData.models?.['Blavalen']?.includes(model) || false;
      applyMoodRotation(targetData, isBlavalen);
    }

    progressCallback(0.8);

    // Apply variants if needed (now with group priority)
    if (applyVariantsFlag) {
      applyVariants(targetData, materialData, targetFileName);
    }

    // Final extension check after all processing
    ensureExtensions(targetData);

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

  // Use group priority for variant ordering
  const orderedVariants = getOrderedVariantsWithGroupPriority(materialData, fileName);
  const exportedVariants: ExportedVariant[] = [];
  const variants = jsonData.extensions?.KHR_materials_variants?.variants || [];

  try {
    // Process variants in the determined order
    for (let i = 0; i < orderedVariants.length; i++) {
      const variantName = orderedVariants[i];
      const variantIndex = variants.findIndex(v => v.name === variantName);
      
      if (variantIndex === -1) continue;

      let variantData: GltfData = cloneDeep(jsonData);

      // Ensure extensions are present in variant data
      ensureExtensions(variantData);

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

      // Update extensions used/required since we removed variants
      if (variantData.extensionsUsed) {
        const variantExtIndex = variantData.extensionsUsed.indexOf('KHR_materials_variants');
        if (variantExtIndex !== -1) {
          variantData.extensionsUsed.splice(variantExtIndex, 1);
        }
      }

      if (applyMoodRotationFlag) {
        const isBlavalen = materialData.models?.['Blavalen']?.includes(model) || false;
        applyMoodRotation(variantData, isBlavalen);
      }

      const variantFileName = `${fileName.replace('.gltf', '')}${variantName}.gltf`;
      const variantBlob = new Blob([JSON.stringify(variantData, null, 2)], { type: 'application/json' });
      const arrayBuffer = await variantBlob.arrayBuffer();

      exportedVariants.push({ fileName: variantFileName, content: arrayBuffer });

      progressCallback((i + 1) / orderedVariants.length);
    }

    return { exportedVariants };
  } catch (error) {
    console.error("Error in exportIndividualVariants:", error);
    throw error;
  }
}