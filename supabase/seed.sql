-- Datos de desarrollo local. En remoto se cargan aparte (ver CLAUDE.md).
insert into public.temporadas (anio, fecha_inicio, fecha_fin, modo_llamadas_desde, modo_llamadas_hasta)
values (2027, '2027-01-21', '2027-03-07', '2027-02-05', '2027-02-06')
on conflict (anio) do nothing;
