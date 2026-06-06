-- Add customizable color columns to the topbar configuration
ALTER TABLE marca
  ADD COLUMN IF NOT EXISTS topbar_bg_color    text NOT NULL DEFAULT '#1c1c1c',
  ADD COLUMN IF NOT EXISTS topbar_text_color  text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS topbar_icon_color  text NOT NULL DEFAULT '#ffffff';

-- Seed defaults on the existing row
UPDATE marca SET
  topbar_bg_color   = '#1c1c1c',
  topbar_text_color = '#ffffff',
  topbar_icon_color = '#ffffff'
WHERE id = 1;
