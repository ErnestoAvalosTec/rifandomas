-- Permite hasta 5 premios por sorteo (antes el máximo era 3)
alter table public.premios drop constraint if exists premios_lugar_check;
alter table public.premios add constraint premios_lugar_check check (lugar between 1 and 5);
