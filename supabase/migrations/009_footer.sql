-- Add customizable footer configuration to marca
ALTER TABLE marca
  ADD COLUMN IF NOT EXISTS footer_bg_color   text NOT NULL DEFAULT '#1c1c1c',
  ADD COLUMN IF NOT EXISTS footer_text_color text NOT NULL DEFAULT '#9ca3af',
  ADD COLUMN IF NOT EXISTS footer_texto      text,
  ADD COLUMN IF NOT EXISTS footer_telefono   text,
  ADD COLUMN IF NOT EXISTS footer_correo     text,
  ADD COLUMN IF NOT EXISTS footer_redes      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_links      jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Seed defaults on the existing row
UPDATE marca SET
  footer_bg_color   = '#1c1c1c',
  footer_text_color = '#9ca3af'
WHERE id = 1;
