 # Common Parts Access — Data Model Evolution

## Context

The original data model was designed for a scenario where users upload their own 3D models. The project now includes a **curation workflow**: importing existing spare part models from external sources (Printables, Thingiverse, GitHub, etc.) under open licenses, with structured metadata and clear attribution.

This document defines the schema changes required to support both workflows (user upload + curation) within a single coherent data model.

---

## New table: `licenses`

Replaces all free-text license fields with a normalized reference table.

```sql
CREATE TABLE licenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spdx_id       TEXT NOT NULL UNIQUE,       -- e.g. "CC0-1.0", "CC-BY-4.0"
  name          TEXT NOT NULL,              -- e.g. "Creative Commons Zero 1.0 Universal"
  short_name    TEXT NOT NULL,              -- e.g. "CC0", "CC BY 4.0"
  url           TEXT NOT NULL,              -- e.g. "https://creativecommons.org/publicdomain/zero/1.0/"
  allows_redistribution  BOOLEAN NOT NULL DEFAULT true,
  requires_attribution   BOOLEAN NOT NULL DEFAULT false,
  allows_commercial      BOOLEAN NOT NULL DEFAULT true,
  is_copyleft            BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Seed data

| spdx_id | short_name | attribution | commercial | copyleft | url |
|---------|-----------|-------------|------------|----------|-----|
| CC0-1.0 | CC0 | no | yes | no | https://creativecommons.org/publicdomain/zero/1.0/ |
| CC-BY-4.0 | CC BY 4.0 | yes | yes | no | https://creativecommons.org/licenses/by/4.0/ |
| CC-BY-SA-4.0 | CC BY-SA 4.0 | yes | yes | yes | https://creativecommons.org/licenses/by-sa/4.0/ |
| CC-BY-NC-4.0 | CC BY-NC 4.0 | yes | no | no | https://creativecommons.org/licenses/by-nc/4.0/ |
| CC-BY-NC-SA-4.0 | CC BY-NC-SA 4.0 | yes | no | yes | https://creativecommons.org/licenses/by-nc-sa/4.0/ |
| MIT | MIT | yes | yes | no | https://opensource.org/licenses/MIT |
| GPL-3.0-only | GPL 3.0 | yes | yes | yes | https://www.gnu.org/licenses/gpl-3.0.html |

---

## Changes to `models` table

### Fields to ADD

```sql
-- Origin tracking
ALTER TABLE models ADD COLUMN origin_type TEXT NOT NULL DEFAULT 'original'
  CHECK (origin_type IN ('original', 'curated', 'manufacturer'));

ALTER TABLE models ADD COLUMN source_url TEXT;                  -- URL of the original post
ALTER TABLE models ADD COLUMN source_platform TEXT;             -- 'printables', 'thingiverse', 'cults3d', 'github', etc.
ALTER TABLE models ADD COLUMN source_published_at TIMESTAMPTZ;  -- original publication date

-- Attribution
ALTER TABLE models ADD COLUMN original_author TEXT;             -- author name/handle on source
ALTER TABLE models ADD COLUMN original_author_url TEXT;         -- link to author profile on source

-- License (foreign keys)
ALTER TABLE models ADD COLUMN license_id UUID REFERENCES licenses(id);
ALTER TABLE models ADD COLUMN source_license_id UUID REFERENCES licenses(id);

-- Validation
ALTER TABLE models ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'author_tested', 'community_validated', 'certified'));
ALTER TABLE models ADD COLUMN makes_count INTEGER DEFAULT 0;
```

### Fields to REMOVE

```sql
-- Replaced by license_id
ALTER TABLE models DROP COLUMN license;
```

### Fields UNCHANGED

Everything else stays as-is: `user_id` (becomes the curator/publisher on Common Parts), `product_id`, `brand_id`, `category_id`, `part_name`, `part_number`, `material`, `print_settings`, `dimensions`, `status`, `tags`, all metric counters.

---

## Constraints and rules

### origin_type semantics

| origin_type | user_id means | original_author | source_url |
|-------------|--------------|-----------------|------------|
| `original` | The creator of the model | NULL (same person) | NULL |
| `curated` | The curator who imported it | Required — the real author | Required |
| `manufacturer` | The brand/manufacturer account | NULL (same entity) | Optional |

### Validation: source fields required when curated

```sql
ALTER TABLE models ADD CONSTRAINT curated_requires_source
  CHECK (
    origin_type != 'curated'
    OR (source_url IS NOT NULL AND original_author IS NOT NULL AND source_license_id IS NOT NULL)
  );
```

### Unique constraint on source_url

Prevents importing the same model twice:

```sql
CREATE UNIQUE INDEX idx_models_source_url ON models (source_url) WHERE source_url IS NOT NULL;
```

---

## Example: IKEA HJÄLPA bracket import

```json
{
  "name": "IKEA HJÄLPA clothes rail bracket (PLATSA)",
  "slug": "ikea-hjalpa-clothes-rail-bracket-platsa",
  "user_id": "<curator_user_id>",
  "product_id": "<platsa_product_id>",
  "brand_id": "<ikea_brand_id>",
  "category_id": "<furniture_storage_wardrobe_id>",
  "part_name": "HJÄLPA clothes rail bracket",
  "material": "PLA / PETG",
  "dimensions": {
    "hole_spacing": 25,
    "rail_diameter": 25,
    "unit": "mm"
  },
  "print_settings": {
    "layer_height": 0.2,
    "infill": 30,
    "perimeters": 3,
    "supports": "buildplate_only"
  },
  "origin_type": "curated",
  "source_url": "https://www.printables.com/model/580093-ikea-wardrobe-replacement-bracket",
  "source_platform": "printables",
  "source_published_at": "2023-09-12T00:00:00Z",
  "original_author": "TeachingTech",
  "original_author_url": "https://www.printables.com/@TeachingTech",
  "license_id": "<cc0_license_id>",
  "source_license_id": "<cc0_license_id>",
  "verification_status": "community_validated",
  "makes_count": 10,
  "status": "published",
  "instructions": "FDM: Support required from build platform only. 3 perimeters, ~30% infill, 0.2mm layer height. PLA works, PETG recommended for more flex. Original IKEA screws can be reused.",
  "tags": ["ikea", "platsa", "hjalpa", "wardrobe", "bracket", "repair"]
}
```

---

## Tables NOT modified

| Table | Reason |
|-------|--------|
| `brands` | Already supports the need (IKEA, Dyson, etc.) |
| `products` | Already links brand + category + model number |
| `categories` | Hierarchical structure already in place |
| `model_files` | File storage structure unchanged |
| `model_likes` | Engagement tracking unchanged |
| `model_downloads` | Download tracking unchanged |
| `model_comments` | Comment structure unchanged |
| `user_profiles` | No changes needed — curators are regular users |
| `collections` | Unchanged |

---

## Migration order

1. Create `licenses` table + seed data
2. Add new columns to `models` (with defaults so existing rows are valid)
3. Migrate existing `license` string values to `license_id` references
4. Drop old `license` column
5. Add constraints (`curated_requires_source`, unique index on `source_url`)
6. Update TypeScript types in `types/database.ts`
7. Update queries in `lib/supabase/queries/`
