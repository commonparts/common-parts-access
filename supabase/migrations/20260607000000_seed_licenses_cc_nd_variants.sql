-- Seed two additional Creative Commons licenses:
-- CC-BY-NC-ND-4.0 and CC-BY-ND-4.0
--
-- These licenses prohibit derivative works.
-- They are valid for link-out references (models we index but do not host).
-- CC-BY-NC-ND-4.0 is excluded from hosted/curated models per curation policy.

INSERT INTO licenses (
  spdx_id,
  name,
  short_name,
  url,
  allows_redistribution,
  requires_attribution,
  allows_commercial,
  is_copyleft
)
VALUES
  (
    'CC-BY-NC-ND-4.0',
    'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International',
    'CC BY-NC-ND 4.0',
    'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    true,   -- redistribution of the original work is permitted
    true,   -- attribution required (BY)
    false,  -- commercial use prohibited (NC)
    false   -- no share-alike requirement (ND prohibits derivatives entirely)
  ),
  (
    'CC-BY-ND-4.0',
    'Creative Commons Attribution-NoDerivatives 4.0 International',
    'CC BY-ND 4.0',
    'https://creativecommons.org/licenses/by-nd/4.0/',
    true,   -- redistribution of the original work is permitted
    true,   -- attribution required (BY)
    true,   -- commercial use allowed (no NC restriction)
    false   -- no share-alike requirement (ND prohibits derivatives entirely)
  )
ON CONFLICT (spdx_id) DO NOTHING;

-- Fix CC0-1.0 name to include "Creative Commons" prefix for consistency
UPDATE licenses
SET name = 'Creative Commons CC0 1.0 Universal'
WHERE spdx_id = 'CC0-1.0';