// ============================================================================
// reference-image-selection.ts
// Spec sections 10 + 11. Selects up to N references in upload order.
// ============================================================================

export const DEFAULT_MAX_MODEL_REFERENCES = 4;
export const DEFAULT_MAX_PRODUCT_REFERENCES = 4;

export interface ReferenceImageRow {
  storage_path: string;
  sort_order: number;
}

export function selectModelReferences<T extends ReferenceImageRow>(
  images: T[],
  max: number = DEFAULT_MAX_MODEL_REFERENCES
): T[] {
  return [...images].sort((a, b) => a.sort_order - b.sort_order).slice(0, max);
}

export function selectProductReferences<T extends ReferenceImageRow>(
  images: T[],
  max: number = DEFAULT_MAX_PRODUCT_REFERENCES
): T[] {
  return [...images].sort((a, b) => a.sort_order - b.sort_order).slice(0, max);
}
