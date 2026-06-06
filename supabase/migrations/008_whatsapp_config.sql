-- WhatsApp Evolution API configuration (single row table)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id int PRIMARY KEY DEFAULT 1,
  CONSTRAINT whatsapp_single_row CHECK (id = 1),
  api_url text,
  api_key text,
  instance_name text DEFAULT 'rifandoplus',
  activo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.whatsapp_config (id, instance_name)
VALUES (1, 'rifandoplus')
ON CONFLICT DO NOTHING;
