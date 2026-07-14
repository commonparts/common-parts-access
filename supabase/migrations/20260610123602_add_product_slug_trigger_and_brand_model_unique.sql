
-- Fonction utilitaire : convertit un texte en slug
CREATE OR REPLACE FUNCTION generate_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(input);
  result := translate(result,
    'àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿ',
    'aaaaaaeceeeeiiiidnoooooouuuuyy'
  );
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Fonction trigger : génère le slug depuis name + model_number, gère les conflits
CREATE OR REPLACE FUNCTION set_product_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug  text;
  candidate  text;
  counter    int := 2;
BEGIN
  -- Slug explicitement fourni et modifié par l'utilisateur → on le garde
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' AND (TG_OP = 'UPDATE' AND NEW.slug <> OLD.slug) THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.model_number IS NOT NULL AND NEW.model_number <> '' THEN
      base_slug := generate_slug(NEW.name || ' ' || NEW.model_number);
    ELSE
      base_slug := generate_slug(NEW.name);
    END IF;

    candidate := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM public.products
      WHERE slug = candidate
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) LOOP
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    END LOOP;

    NEW.slug := candidate;
  END IF;

  -- Regénère si name ou model_number change sans modification manuelle du slug
  IF TG_OP = 'UPDATE'
    AND NEW.slug = OLD.slug
    AND (NEW.model_number IS DISTINCT FROM OLD.model_number OR NEW.name IS DISTINCT FROM OLD.name) THEN

    counter := 2;
    IF NEW.model_number IS NOT NULL AND NEW.model_number <> '' THEN
      base_slug := generate_slug(NEW.name || ' ' || NEW.model_number);
    ELSE
      base_slug := generate_slug(NEW.name);
    END IF;

    candidate := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM public.products
      WHERE slug = candidate AND id <> NEW.id
    ) LOOP
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    END LOOP;

    NEW.slug := candidate;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS product_slug_trigger ON public.products;
CREATE TRIGGER product_slug_trigger
  BEFORE INSERT OR UPDATE OF name, slug, model_number
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_slug();

-- Contrainte unique (brand_id, model_number) — NULLs exclus automatiquement
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_brand_model_number_unique;
ALTER TABLE public.products
  ADD CONSTRAINT products_brand_model_number_unique UNIQUE (brand_id, model_number);
;