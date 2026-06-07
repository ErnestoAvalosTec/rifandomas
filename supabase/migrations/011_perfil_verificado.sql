-- Add social-media handle (collected at signup) and admin-controlled verification badge to perfiles
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS red_social_verificacion text,
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT false;
