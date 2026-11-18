# Tarea programada del radar

El radar corre como una **tarea programada de Claude** (en la nube), todos los días a las
**7:17, 12:17, 15:17, 18:17 y 21:17** (hora del centro de México).

En cada revisión:

1. **Busca** en Promodescuentos (nuevas, calientes y grupos de Electrónica, Celulares,
   Electrodomésticos y Videojuegos), en sitios de ofertas confiables y con búsquedas de
   "error de precio" por tienda y categoría.
2. **Filtra**: solo tiendas de prestigio o vendedores oficiales, y solo errores de precio o
   descuentos de **50% o más** frente al precio habitual real (no el "antes $X" de la tienda).
   Las ofertas deben ser recientes (últimas ~5 horas).
3. **Consigue** la liga directa a la tienda y las características del producto.
4. **Guarda** cada oferta en `public.ofertas_alerta` con `on conflict (url_tienda) do nothing`
   (así no se repiten) y ejecuta `select public.enviar_whatsapp_ofertas();`.
5. **Avisa** con una notificación de Claude solo si hubo ofertas nuevas.

## Tiendas que vigila

- **Departamentales:** Liverpool, El Palacio de Hierro, Sears, Sanborns, Suburbia, Coppel, Elektra
- **Supermercados y mayoreo:** Walmart, Bodega Aurrera, Soriana, Chedraui, Costco, Sam's Club
- **En línea:** Amazon México (vendido y enviado por Amazon), Mercado Libre (tiendas oficiales o vendido por Mercado Libre)
- **Tecnología y oficina:** Cyberpuerta, DDTech, Office Depot, OfficeMax, The Home Depot, Telcel, AT&T
- **Tiendas oficiales:** Apple, Samsung, Motorola, Xiaomi, Sony, LG, Lenovo, HP, Nintendo, PlayStation Store, Xbox

## Formato de inserción

```sql
insert into public.ofertas_alerta
  (categoria, producto, tienda, precio, precio_normal, descuento,
   url_tienda, url_fuente, nota, es_error, detalles, condicion)
values
  ('Celulares', 'Samsung Galaxy S26 FE 256 GB', 'Amazon México', 8449, 17200, 51,
   'https://…', 'https://…', 'Revisa que diga "Vendido por Amazon"', false,
   'Pantalla 6.7" · Exynos 2500 · 8 GB RAM · 256 GB',
   '$12,999 directo; $8,449 solo con promociones bancarias')
on conflict (url_tienda) do nothing;
```
