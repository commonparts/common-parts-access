-- ============================================================================
-- Model/product compatibility junction table
-- Issue #162: support multiple compatible products per model
-- Created: 2026-06-01
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_products (
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (model_id, product_id)
);

INSERT INTO public.model_products (model_id, product_id)
SELECT id, product_id
FROM public.models
WHERE product_id IS NOT NULL
ON CONFLICT (model_id, product_id) DO NOTHING;

ALTER TABLE public.model_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "model_products: public read" ON public.model_products;
CREATE POLICY "model_products: public read"
  ON public.model_products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "model_products: owner insert" ON public.model_products;
CREATE POLICY "model_products: owner insert"
  ON public.model_products FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.models
      WHERE id = model_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "model_products: owner delete" ON public.model_products;
CREATE POLICY "model_products: owner delete"
  ON public.model_products FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.models
      WHERE id = model_id
        AND user_id = auth.uid()
    )
  );