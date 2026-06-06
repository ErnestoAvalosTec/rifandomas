-- Add category column to premios — assigned by admin at approval time
ALTER TABLE premios
  ADD COLUMN IF NOT EXISTS categoria text;
