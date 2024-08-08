// src/types/material.ts

export interface Material {
  name: string;
  tags: string[];
}

export interface Variant {
  name: string;
  material: string;
}

export interface MaterialData {
  materials: Material[];
  materialVariants: { [key: string]: string[] | { [key: string]: string[] } };
  defaultMaterials: { [key: string]: { default: string; variantMapping?: string } };
  models: { [key: string]: string[] };
}