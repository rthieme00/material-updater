export type EditorSection = 'materials' | 'meshes' | 'variants';

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
  autoTag?: {
    enabled: boolean;
    tag: string;
  };
}

export interface MaterialData {
  materials: Material[];
  meshAssignments: { [key: string]: MeshAssignment };
  sortSettings?: {
    tagStates: Array<{
      name: string;
      enabled: boolean;
      order: number;
    }>;
    timestamp: number;
    autoSortEnabled: boolean;
  };
  models?: {
    [key: string]: string[];
  };
}

export interface TagSortState {
  name: string;
  enabled: boolean;
  order: number;
}