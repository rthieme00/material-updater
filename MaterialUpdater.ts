import { promises as fs } from 'fs';
import path from 'path';

interface MaterialData {
  materialVariants: { [key: string]: string[] | { [key: string]: string[] } };
  defaultMaterials: { [key: string]: { default: string; variantMapping?: string } };
  models: { [key: string]: string[] };
}

let materialData: MaterialData;

async function loadMaterialData() {
  const data = await fs.readFile(path.join(process.cwd(), 'data', 'Materials.json'), 'utf-8');
  materialData = JSON.parse(data);
}

function findMaterialIndex(targetData: any, name: string): number {
  return targetData.materials.findIndex((material: any) => material.name === name);
}

function findVariantIndex(targetData: any, name: string): number {
  const variants = targetData.extensions?.KHR_materials_variants?.variants || [];
  return variants.findIndex((variant: any) => variant.name === name);
}

function applyVariants(targetData: any) {
  for (const [meshName, matName] of Object.entries(materialData.defaultMaterials)) {
    const matIndex = findMaterialIndex(targetData, (matName as any).default);

    let variantArray: any[] = [];

    const variantMapping = (matName as any).variantMapping;
    if (variantMapping) {
      const materialVariants = materialData.materialVariants[variantMapping];
      if (Array.isArray(materialVariants)) {
        variantArray = materialVariants.map(variant => ({
          material: findMaterialIndex(targetData, variant),
          variants: [findVariantIndex(targetData, variant)]
        }));
      } else if (typeof materialVariants === 'object') {
        variantArray = Object.entries(materialVariants).map(([variant, v]) => ({
          material: findMaterialIndex(targetData, variant),
          variants: (v as string[]).map(vItem => findVariantIndex(targetData, vItem))
        }));
      }
    }

    for (const mesh of targetData.meshes) {
      if (mesh.name === meshName) {
        for (const primitive of mesh.primitives) {
          primitive.material = matIndex;
          if (variantMapping) {
            primitive.extensions = primitive.extensions || {};
            primitive.extensions.KHR_materials_variants = { mappings: variantArray };
          }
        }
      }
    }
  }
}

function applyMoodRotation(targetData: any, blavalen: boolean) {
  for (const material of targetData.materials) {
    if (material.name.startsWith('MOO-')) {
      const matIdx = findMaterialIndex(targetData, material.name);
      const rotation = blavalen ? 0 : 1.56;
      
      targetData.materials[matIdx].normalTexture.extensions.KHR_texture_transform.rotation = rotation;
      targetData.materials[matIdx].pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform.rotation = rotation;
      targetData.materials[matIdx].extensions.KHR_materials_sheen.sheenColorTexture.extensions.KHR_texture_transform.rotation = rotation;
    }
  }
}

export async function updateMaterials(
  referenceFile: File,
  targetFiles: File[],
  model: string,
  applyVariantsFlag: boolean,
  applyMoodRotationFlag: boolean
) {
  await loadMaterialData();

  const referenceData = JSON.parse(await referenceFile.text());
  const updatedFiles: string[] = [];

  for (const targetFile of targetFiles) {
    const targetData = JSON.parse(await targetFile.text());

    // Update extensions
    targetData.extensions = referenceData.extensions;
    targetData.extensionsRequired = referenceData.extensionsRequired;
    targetData.extensionsUsed = referenceData.extensionsUsed;

    // Update materials and textures
    targetData.materials = referenceData.materials;
    targetData.textures = referenceData.textures;

    // Update images
    if (referenceData.images) {
      const aoImage = targetData.images[0];
      targetData.images = [aoImage, ...referenceData.images.slice(1)];
    }

    // Update samplers
    targetData.samplers = targetData.samplers || [];

    // Apply variants if flag is set
    if (applyVariantsFlag) {
      applyVariants(targetData);
    }

    // Apply mood rotation if flag is set and model is Blavalen
    if (applyMoodRotationFlag && materialData.models['Blavalen'].includes(targetFile.name)) {
      applyMoodRotation(targetData, true);
    } else if (applyMoodRotationFlag) {
      applyMoodRotation(targetData, false);
    }

    // Filter by model if specified
    if (model && model !== 'Regular') {
      const modelFiles = materialData.models[model];
      if (!modelFiles.some(name => targetFile.name.includes(name))) {
        continue;  // Skip this file if it doesn't match the selected model
      }
    }

    // Write updated data back to file
    const outputPath = path.join(process.cwd(), 'public', 'updated', targetFile.name);
    await fs.writeFile(outputPath, JSON.stringify(targetData, null, 2));
    updatedFiles.push(targetFile.name);
  }

  return updatedFiles;
}