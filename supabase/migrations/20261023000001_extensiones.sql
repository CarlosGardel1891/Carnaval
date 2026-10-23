-- Extensiones base: PostGIS para ubicaciones y recorridos, unaccent para búsquedas sin tildes.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;
