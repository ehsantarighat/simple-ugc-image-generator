import { z } from "zod";

export const modelCreateSchema = z.object({
  name: z.string().min(1, "Name is required.").max(80),
  description: z.string().max(400).optional().nullable(),
});

export const modelUpdateSchema = modelCreateSchema.extend({
  id: z.string().uuid(),
});

export type ModelCreateInput = z.infer<typeof modelCreateSchema>;
export type ModelUpdateInput = z.infer<typeof modelUpdateSchema>;
