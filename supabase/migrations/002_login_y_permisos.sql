-- Radar de Errores de Precio · 002
-- Acceso con login: solo los correos en radar_admins pueden ver ofertas y configurar WhatsApp.

create table if not exists public.radar_admins (
  email text primary key
);
alter table public.radar_admins enable row level security;

create or replace function public.radar_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.radar_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.radar_es_admin() from public, anon;
grant execute on function public.radar_es_admin() to authenticated;

drop policy if exists radar_admin_select on public.ofertas_alerta;
create policy radar_admin_select on public.ofertas_alerta
  for select to authenticated using (public.radar_es_admin());

drop policy if exists radar_admin_update on public.ofertas_alerta;
create policy radar_admin_update on public.ofertas_alerta
  for update to authenticated using (public.radar_es_admin()) with check (public.radar_es_admin());

grant select, update on public.ofertas_alerta to authenticated;

-- Configuración de WhatsApp solo mediante funciones (la apikey nunca se devuelve)
create or replace function public.radar_leer_config()
returns table (telefono text, tiene_key boolean, activo boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.radar_es_admin() then raise exception 'No autorizado'; end if;
  return query select c.telefono, c.apikey is not null, c.activo from public.ofertas_config c where c.id = 1;
end $$;

create or replace function public.radar_guardar_config(p_telefono text, p_apikey text, p_activo boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.radar_es_admin() then raise exception 'No autorizado'; end if;
  update public.ofertas_config set
    telefono = nullif(trim(p_telefono), ''),
    apikey = coalesce(nullif(trim(p_apikey), ''), apikey),
    activo = coalesce(p_activo, activo)
  where id = 1;
end $$;

create or replace function public.radar_probar_whatsapp()
returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.radar_es_admin() then raise exception 'No autorizado'; end if;
  return public.probar_whatsapp_ofertas();
end $$;

revoke all on function public.radar_leer_config() from public, anon;
revoke all on function public.radar_guardar_config(text, text, boolean) from public, anon;
revoke all on function public.radar_probar_whatsapp() from public, anon;
grant execute on function public.radar_leer_config() to authenticated;
grant execute on function public.radar_guardar_config(text, text, boolean) to authenticated;
grant execute on function public.radar_probar_whatsapp() to authenticated;

-- Después de aplicar, agrega tu correo (el mismo con el que entras a la app):
-- insert into public.radar_admins (email) values ('tu@correo.com');
