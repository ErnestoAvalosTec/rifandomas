-- Add avatar and admin-editable rating to perfiles (used on the public sorteo page to show organizer info)
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS avatar_url   text,
  ADD COLUMN IF NOT EXISTS calificacion numeric(2,1) NOT NULL DEFAULT 5.0 CHECK (calificacion >= 0 AND calificacion <= 5);
