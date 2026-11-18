-- Radar de Errores de Precio · 001
-- Tabla de ofertas, configuración de WhatsApp (CallMeBot) y funciones de envío.

create extension if not exists pg_net;

create table if not exists public.ofertas_alerta (
  id bigserial primary key,
  creado timestamptz not null default now(),
  categoria text,                      -- Electrónica, Celulares, Electrodomésticos, Videojuegos u Otros
  producto text not null,
  tienda text not null,
  precio numeric,                      -- precio más bajo alcanzable (MXN)
  precio_normal numeric,               -- precio habitual (MXN)
  descuento int,                       -- % de descuento (0-100)
  url_tienda text not null unique,     -- liga directa al producto (evita duplicados)
  url_fuente text,                     -- dónde se detectó
  nota text,                           -- advertencia o riesgo
  es_error boolean default false,      -- true si se reporta como error de precio
  estado text not null default 'nueva' check (estado in ('nueva','vista','comprada','descartada')),
  whatsapp_enviado boolean not null default false,
  whatsapp_enviado_en timestamptz,
  detalles text,                       -- características separadas por " · "
  condicion text                       -- cómo se llega al precio (directo, banco, cupón…)
);
alter table public.ofertas_alerta enable row level security;
create index if not exists ofertas_alerta_creado_idx on public.ofertas_alerta (creado desc);

create table if not exists public.ofertas_config (
  id int primary key default 1 check (id = 1),
  telefono text,
  apikey text,
  activo boolean not null default true
);
alter table public.ofertas_config enable row level security;
insert into public.ofertas_config (id) values (1) on conflict do nothing;

create or replace function public.url_encode(data text) returns text
language sql immutable set search_path = public as $$
  select coalesce(string_agg(
    case when ch ~ '^[A-Za-z0-9_.~-]$' then ch
         else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end,
    '' order by ord), '')
  from regexp_split_to_table(data, '') with ordinality as t(ch, ord);
$$;

create or replace function public.ofertas_fmt(n numeric) returns text
language sql immutable set search_path = public as $$
  select case when n is null then '?' else '$' || to_char(n, 'FM999,999,990.00') end;
$$;

-- Envía por WhatsApp (CallMeBot) las ofertas aún no enviadas: un mensaje por oferta, máximo 8.
create or replace function public.enviar_whatsapp_ofertas() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg record; o record; msg text; n int := 0;
begin
  select * into cfg from public.ofertas_config where id = 1;
  if cfg is null or not cfg.activo or cfg.telefono is null or cfg.apikey is null then
    return 'WhatsApp no configurado o desactivado';
  end if;
  for o in
    select * from public.ofertas_alerta
    where not whatsapp_enviado and creado > now() - interval '12 hours'
    order by creado limit 8
  loop
    msg := case when o.es_error then '🚨 *ERROR DE PRECIO*' else '🔥 *PRECIO MUY BAJO*' end
      || coalesce(' · ' || o.categoria, '') || E'\n\n'
      || '*' || o.producto || '*' || E'\n'
      || '🏬 ' || o.tienda || E'\n'
      || '💰 ' || ofertas_fmt(o.precio)
      || coalesce(' (normal ~' || ofertas_fmt(o.precio_normal) || ')', '')
      || coalesce(' · -' || o.descuento || '%', '') || E'\n\n'
      || '👉 Ir a la tienda: ' || o.url_tienda
      || coalesce(E'\n📰 Fuente: ' || o.url_fuente, '')
      || coalesce(E'\n⚠️ ' || o.nota, '');
    perform net.http_get(
      'https://api.callmebot.com/whatsapp.php?phone=' || url_encode(cfg.telefono)
      || '&text=' || url_encode(msg) || '&apikey=' || url_encode(cfg.apikey));
    update public.ofertas_alerta set whatsapp_enviado = true, whatsapp_enviado_en = now() where id = o.id;
    n := n + 1;
  end loop;
  return n || ' WhatsApp enviados';
end $$;

create or replace function public.probar_whatsapp_ofertas() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare cfg record;
begin
  select * into cfg from public.ofertas_config where id = 1;
  if cfg.telefono is null or cfg.apikey is null then return 'Falta telefono o apikey'; end if;
  perform net.http_get(
    'https://api.callmebot.com/whatsapp.php?phone=' || url_encode(cfg.telefono)
    || '&text=' || url_encode('✅ Tu radar de errores de precio ya está conectado a WhatsApp.')
    || '&apikey=' || url_encode(cfg.apikey));
  return 'Prueba enviada';
end $$;

revoke all on function public.enviar_whatsapp_ofertas() from public, anon, authenticated;
revoke all on function public.probar_whatsapp_ofertas() from public, anon, authenticated;
