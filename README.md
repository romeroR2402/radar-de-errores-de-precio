# 📡 Radar de Errores de Precio

App web personal que muestra **errores de precio y descuentos de más de 50%** en tiendas de
prestigio de México (Amazon, Mercado Libre oficial, Liverpool, Walmart, Costco, Coppel,
Cyberpuerta y más). Da prioridad a **electrónica, celulares, electrodomésticos y videojuegos**.

- 🔎 Una tarea programada de Claude revisa 5 veces al día y guarda las ofertas en Supabase.
- 📱 La app se instala en el celular como cualquier aplicación (PWA).
- 🔐 Tiene login: solo los correos autorizados ven las ofertas.
- 💬 Avisos opcionales por WhatsApp con la liga directa a la tienda (CallMeBot).

## Cómo funciona

```
Tarea programada de Claude ──► Supabase (ofertas_alerta) ──► App web (GitHub Pages)
        (5 veces al día)              │
                                      └──► WhatsApp (CallMeBot, opcional)
```

Cada oferta trae: producto, tienda, precio, precio normal, % de descuento, **condición**
(por ejemplo "51% solo con promociones bancarias"), **características**, liga directa
**Ir a la tienda** y una nota de riesgo.

## Estructura

```
index.html                 Pantalla de login y app
css/styles.css             Estilos
js/config.js               URL y clave pública de Supabase
js/app.js                  Lógica de la app (supabase-js)
manifest.webmanifest       Para instalarla en el celular
sw.js                      Service worker (abre rápido y sin conexión)
icons/                     Ícono de la app
supabase/migrations/       Esquema de la base de datos
docs/tarea-programada.md   Qué hace la revisión automática
```

## Puesta en marcha

1. **Base de datos:** aplica en orden los archivos de `supabase/migrations/` desde el
   SQL Editor de Supabase.
2. **Autoriza tu correo** (el mismo con el que entras a la app):
   ```sql
   insert into public.radar_admins (email) values ('tu@correo.com');
   ```
3. **Publica la app:** en GitHub, ve a *Settings → Pages* y elige
   *Deploy from a branch → main → / (root)*. Queda en
   `https://<tu-usuario>.github.io/radar-de-errores-de-precio/`.
4. **Instálala en tu celular:** abre esa liga en el navegador del celular y elige
   *Agregar a pantalla de inicio* (Safari) o *Instalar app* (Chrome).

## WhatsApp (opcional)

Dentro de la app toca **⚙️ WhatsApp**, pon tu número con `+52` y la *apikey* de
[CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/), y dale a
**Enviar prueba**. La clave se guarda en Supabase y nunca se muestra en la app.

## Seguridad

- La clave de `js/config.js` es la **publishable key**: es pública por diseño.
  Lo que protege los datos son las políticas RLS de Supabase.
- Las ofertas solo se pueden leer con sesión iniciada y con el correo en `radar_admins`.
- La configuración de WhatsApp solo se lee y se guarda mediante funciones que validan
  al administrador.

## Aviso

Las tiendas pueden cancelar pedidos hechos con un error de precio. Toma capturas del
precio antes de pagar y revisa que el vendedor sea la tienda oficial.
