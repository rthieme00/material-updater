// src/lib/MaterialUpdater.ts

interface Material {
  name: string;
  tags?: string[];
}

interface MaterialData {
  materials: Material[];
  materialVariants: { [key: string]: string[] | { [key: string]: string[] } };
  defaultMaterials: { [key: string]: { default: string; variantMapping?: string } };
  models: { [key: string]: string[] };
}

function findMaterialIndex(targetData: any, name: string): number {
  return targetData.materials.findIndex((material: any) => material.name === name);
}

function findVariantIndex(targetData: any, name: string): number {
  const variants = targetData.extensions?.KHR_materials_variants?.variants || [];
  return variants.findIndex((variant: any) => variant.name === name);
}

function applyVariants(targetData: any, materialData: any) {
  if (!materialData || !materialData.meshAssignments) {
    console.warn('Material data is missing meshAssignments');
    return;
  }

  console.log('Applying variants with material data:', materialData);

  // Ensure KHR_materials_variants extension is present
  if (!targetData.extensions) targetData.extensions = {};
  if (!targetData.extensions.KHR_materials_variants) {
    targetData.extensions.KHR_materials_variants = { variants: [] };
  }

  const targetVariants = targetData.extensions.KHR_materials_variants.variants;

  // Step 1: Collect all unique variants
  const allVariants = new Set<string>();
  Object.values(materialData.meshAssignments).forEach((assignment: any) => {
    assignment.variants.forEach((variant: any) => {
      allVariants.add(variant.name);
    });
  });

  // Step 2: Add all variants to target file's extensions
  allVariants.forEach(variantName => {
    if (!targetVariants.some((v: any) => v.name === variantName)) {
      targetVariants.push({ name: variantName });
    }
  });

  // Function to find variant index
  const findVariantIndex = (name: string) => targetVariants.findIndex((v: any) => v.name === name);

  // Step 3: Apply variants to meshes
  targetData.meshes.forEach((mesh: any) => {
    const meshAssignment = materialData.meshAssignments[mesh.name];
    if (!meshAssignment) return;

    mesh.primitives.forEach((primitive: any) => {
      if (!primitive.extensions) primitive.extensions = {};
      if (!primitive.extensions.KHR_materials_variants) {
        primitive.extensions.KHR_materials_variants = { mappings: [] };
      }

      const mappings = primitive.extensions.KHR_materials_variants.mappings;

      // Set default material
      const defaultMaterialIndex = findMaterialIndex(targetData, meshAssignment.defaultMaterial);
      if (defaultMaterialIndex !== -1) {
        primitive.material = defaultMaterialIndex;
      }

      // Apply variants
      meshAssignment.variants.forEach((variant: any) => {
        const materialIndex = findMaterialIndex(targetData, variant.material);
        const variantIndex = findVariantIndex(variant.name);
        if (materialIndex !== -1 && variantIndex !== -1) {
          mappings.push({ material: materialIndex, variants: [variantIndex] });
        }
      });
    });
  });

  console.log('Updated target data with new variants:', targetData);
}

export function compareMaterials(referenceData: any, materialData: any): string[] {
  const differences: string[] = [];

  if (!referenceData || !referenceData.materials) {
    differences.push("Reference GLTF file is missing or does not contain materials.");
    return differences;
  }

  if (!materialData || !materialData.materials) {
    differences.push("Material JSON data is missing or does not contain materials.");
    return differences;
  }

  const referenceMaterials = Array.from(new Set(referenceData.materials.map((m: any) => m.name)));
  const jsonMaterials = new Set(materialData.materials.map((m: any) => m.name));

  for (const material of referenceMaterials) {
    if (!jsonMaterials.has(material)) {
      differences.push(`Material "${material}" is in the reference GLTF file but not in the JSON.`);
    }
  }

  for (const material of Array.from(jsonMaterials)) {
    if (!referenceMaterials.includes(material)) {
      differences.push(`Material "${material}" is in the JSON but not in the reference GLTF file.`);
    }
  }

  return differences;
}

export async function updateMaterials(
  referenceFile: File,
  targetFiles: File[],
  model: string,
  applyVariantsFlag: boolean,
  applyMoodRotationFlag: boolean,
  materialData: any
): Promise<ArrayBuffer[]> {
  console.log("Starting updateMaterials function");
  const updatedFiles: ArrayBuffer[] = [];

  if (!materialData) {
    throw new Error("Material JSON data is missing. Please upload a valid Materials.json file.");
  }

  try {
    const referenceContent = await referenceFile.text();
    const referenceData = JSON.parse(referenceContent);

    for (const targetFile of targetFiles) {
      console.log(`Processing target file: ${targetFile.name}`);
      const targetContent = await targetFile.text();
      let targetData = JSON.parse(targetContent);

      // Update extensions
      targetData.extensions = referenceData.extensions;
      targetData.extensionsRequired = referenceData.extensionsRequired;
      targetData.extensionsUsed = referenceData.extensionsUsed;

      // Check for original AO texture and image
      const hasOriginalAOTexture = targetData.textures && targetData.textures.length > 0;
      const hasOriginalAOImage = targetData.images && targetData.images.length > 0;

      // Preserve the original AO texture and image if they exist
      const originalAOTexture = hasOriginalAOTexture ? targetData.textures[0] : null;
      const originalAOImage = hasOriginalAOImage ? targetData.images[0] : null;

      // Update materials, textures, and images
      targetData.materials = referenceData.materials;
      targetData.textures = referenceData.textures;
      targetData.images = referenceData.images;

      // Replace AO texture and image if they existed in the original file
      if (hasOriginalAOTexture && originalAOTexture) {
        targetData.textures[0] = originalAOTexture;
      }
      if (hasOriginalAOImage && originalAOImage) {
        targetData.images[0] = originalAOImage;
      }

      targetData.samplers = targetData.samplers || [];

      // Ensure AO texture source is set correctly if it exists
      if (hasOriginalAOTexture && targetData.textures[0] && targetData.textures[0].source !== 0) {
        targetData.textures[0].source = 0;
      }

      // Apply mood rotation if flag is set
      if (applyMoodRotationFlag) {
        const isBlavalen = materialData.models && materialData.models['Blavalen'] && 
                           materialData.models['Blavalen'].includes(targetFile.name);
        applyMoodRotation(targetData, isBlavalen);
      }

      // Apply variants if flag is set
      if (applyVariantsFlag) {
        try {
          applyVariants(targetData, materialData);
        } catch (error) {
          console.error('Error applying variants:', error);
        }
      }

      // Filter by model if specified
      if (model && model !== 'Regular' && materialData.models) {
        const modelFiles = materialData.models[model];
        if (!modelFiles || !modelFiles.some((name: string) => targetFile.name.includes(name))) {
          console.log(`Skipping file ${targetFile.name} as it doesn't match the selected model.`);
          continue;
        }
      }

      const updatedBlob = new Blob([JSON.stringify(targetData, null, 2)], { type: 'application/json' });
      const arrayBuffer = await updatedBlob.arrayBuffer();
      updatedFiles.push(arrayBuffer);
      console.log(`Updated file processed: ${targetFile.name}`);
    }
  } catch (error) {
    console.error("Error in updateMaterials:", error);
    throw error;
  }

  console.log(`Total updated files: ${updatedFiles.length}`);
  return updatedFiles;
}

function applyMoodRotation(targetData: any, isBlavalen: boolean) {
  for (const material of targetData.materials) {
    if (material.name.startsWith('MOO-')) {
      const rotation = isBlavalen ? 0 : 1.56;
      
      if (material.normalTexture && material.normalTexture.extensions && material.normalTexture.extensions.KHR_texture_transform) {
        material.normalTexture.extensions.KHR_texture_transform.rotation = rotation;
      }
      
      if (material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorTexture && 
          material.pbrMetallicRoughness.baseColorTexture.extensions && material.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform) {
        material.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform.rotation = rotation;
      }
      
      if (material.extensions && material.extensions.KHR_materials_sheen && 
          material.extensions.KHR_materials_sheen.sheenColorTexture && 
          material.extensions.KHR_materials_sheen.sheenColorTexture.extensions && 
          material.extensions.KHR_materials_sheen.sheenColorTexture.extensions.KHR_texture_transform) {
        material.extensions.KHR_materials_sheen.sheenColorTexture.extensions.KHR_texture_transform.rotation = rotation;
      }
    }
  }
}

export async function exportIndividualVariants(
  referenceFile: File,
  targetFiles: File[],
  model: string,
  applyMoodRotationFlag: boolean,
  materialData: any
): Promise<Array<{ fileName: string, content: ArrayBuffer }>> {
  console.log("Starting exportIndividualVariants function");
  const exportedFiles: Array<{ fileName: string, content: ArrayBuffer }> = [];

  if (!materialData) {
    throw new Error("Material JSON data is missing. Please upload a valid Materials.json file.");
  }

  try {
    for (const targetFile of targetFiles) {
      console.log(`Processing target file: ${targetFile.name}`);
      const targetContent = await targetFile.text();
      const targetData = JSON.parse(targetContent);

      // Get all variants
      const variants = targetData.extensions?.KHR_materials_variants?.variants || [];

      // For each variant, create a separate GLTF file
      for (const variant of variants) {
        console.log(`Processing variant: ${variant.name}`);
        let variantData = JSON.parse(JSON.stringify(targetData)); // Deep clone

        // Set the variant as the default material for all meshes
        variantData.meshes.forEach((mesh: any) => {
          mesh.primitives.forEach((primitive: any) => {
            if (primitive.extensions && primitive.extensions.KHR_materials_variants) {
              const variantMapping = primitive.extensions.KHR_materials_variants.mappings.find(
                (mapping: any) => mapping.variants.includes(variants.indexOf(variant))
              );
              if (variantMapping) {
                primitive.material = variantMapping.material;
              }
            }
          });
        });

        // Collect used materials, textures, and images
        const usedMaterials = new Set<number>();
        const usedTextures = new Set<number>();
        const usedImages = new Set<number>();

        variantData.meshes.forEach((mesh: any) => {
          mesh.primitives.forEach((primitive: any) => {
            if (primitive.material !== undefined) {
              usedMaterials.add(primitive.material);
            }
          });
        });

        // Create new arrays for materials, textures, and images
        const newMaterials: any[] = [];
        const newTextures: any[] = [];
        const newImages: any[] = [];

        // Process materials and update texture references
        usedMaterials.forEach((oldMaterialIndex) => {
          const material = variantData.materials[oldMaterialIndex];
          const newMaterialIndex = newMaterials.length;

          // Update material references in meshes
          variantData.meshes.forEach((mesh: any) => {
            mesh.primitives.forEach((primitive: any) => {
              if (primitive.material === oldMaterialIndex) {
                primitive.material = newMaterialIndex;
              }
            });
          });

          // Process textures in the material
          const processTexture = (textureInfo: any) => {
            if (textureInfo && textureInfo.index !== undefined) {
              const oldTextureIndex = textureInfo.index;
              const texture = variantData.textures[oldTextureIndex];
              
              if (!usedTextures.has(oldTextureIndex)) {
                usedTextures.add(oldTextureIndex);
                const newTextureIndex = newTextures.length;
                newTextures.push(texture);
                textureInfo.index = newTextureIndex;

                // Process image
                if (texture.source !== undefined) {
                  const oldImageIndex = texture.source;
                  if (!usedImages.has(oldImageIndex)) {
                    usedImages.add(oldImageIndex);
                    const newImageIndex = newImages.length;
                    newImages.push(variantData.images[oldImageIndex]);
                    texture.source = newImageIndex;
                  } else {
                    texture.source = newImages.findIndex((img: any) => img === variantData.images[oldImageIndex]);
                  }
                }
              } else {
                textureInfo.index = newTextures.findIndex((tex: any) => tex === texture);
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

          // Process sheen texture
          if (material.extensions && material.extensions.KHR_materials_sheen) {
            processTexture(material.extensions.KHR_materials_sheen.sheenColorTexture);
            processTexture(material.extensions.KHR_materials_sheen.sheenRoughnessTexture);
          }

          newMaterials.push(material);
        });

        // Update the variant data with new arrays
        variantData.materials = newMaterials;
        variantData.textures = newTextures;
        variantData.images = newImages;

        // Remove variants
        delete variantData.extensions.KHR_materials_variants;
        variantData.meshes.forEach((mesh: any) => {
          mesh.primitives.forEach((primitive: any) => {
            if (primitive.extensions) {
              delete primitive.extensions.KHR_materials_variants;
            }
          });
        });

        // Apply mood rotation if flag is set
        if (applyMoodRotationFlag) {
          const isBlavalen = materialData.models && materialData.models['Blavalen'] && 
                             materialData.models['Blavalen'].includes(targetFile.name);
          applyMoodRotation(variantData, isBlavalen);
        }

       // Create file name
        const fileName = `${targetFile.name.replace('.gltf', '')}${variant.name}.gltf`;

        // Convert to ArrayBuffer
        const variantBlob = new Blob([JSON.stringify(variantData, null, 2)], { type: 'application/json' });
        const arrayBuffer = await variantBlob.arrayBuffer();

        exportedFiles.push({ fileName, content: arrayBuffer });
        console.log(`Exported variant file: ${fileName}`);
      }
    }
  } catch (error) {
    console.error("Error in exportIndividualVariants:", error);
    throw error;
  }

  console.log(`Total exported variant files: ${exportedFiles.length}`);
  return exportedFiles;
} 