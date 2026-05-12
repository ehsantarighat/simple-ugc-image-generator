import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required.").max(80),
  brand_name: z.string().max(80).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  description: z.string().max(600).optional().nullable(),
  preservation_notes: z.string().max(400).optional().nullable(),
});

export const productUpdateSchema = productCreateSchema.extend({
  id: z.string().uuid(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
