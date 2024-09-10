// src/types/material.ts

export interface Material {
  name: string;
  tags: string[];
}

export interface Variant {
  name: string;
  material: string;
}

export interface MeshAssignment {
  defaultMaterial: string;
  variants: Variant[];
}

export interface ModelAssignment {
  [modelName: string]: string[];
}

export interface MaterialData {
  materials: Material[];
  meshAssignments: { [meshName: string]: MeshAssignment };
  materialVariants?: { [key: string]: string[] | { [key: string]: string[] } };
  models?: ModelAssignment;
}

export interface ExportedVariant {
  fileName: string;
  content: ArrayBuffer;
}

export interface GltfTexture {
  index: number;
  extensions?: {
    KHR_texture_transform?: {
      rotation: number;
    };
  };
}

export interface GltfMaterial {
  name: string;
  pbrMetallicRoughness?: {
    baseColorTexture?: GltfTexture;
    metallicRoughnessTexture?: GltfTexture;
  };
  normalTexture?: GltfTexture;
  occlusionTexture?: GltfTexture;
  emissiveTexture?: GltfTexture;
  extensions?: {
    KHR_materials_sheen?: {
      sheenColorTexture?: GltfTexture;
      sheenRoughnessTexture?: GltfTexture;
    };
  };
}

export interface GltfPrimitive {
  material?: number;
  extensions?: {
    KHR_materials_variants?: {
      mappings: Array<{
        material: number;
        variants: number[];
      }>;
    };
  };
}

export interface GltfMesh {
  name: string;
  primitives: GltfPrimitive[];
}

export interface GltfData {
  materials: GltfMaterial[];
  meshes: GltfMesh[];
  textures: any[];
  images: any[];
  extensions?: {
    KHR_materials_variants?: {
      variants: Array<{ name: string }>;
    };
  };
}

export interface ProcessFileOptions {
  fileName: string;
  model: string;
  applyVariants: boolean;
  applyMoodRotation: boolean;
  materialData: MaterialData;
}

export interface UpdateMaterialsResult {
  updatedData: GltfData;
  fileName: string;
}

export interface ExportVariantsResult {
  exportedVariants: ExportedVariant[];
}