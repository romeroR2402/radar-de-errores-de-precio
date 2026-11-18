import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const CATS = ["Todas", "Electrónica", "Celulares", "Electrodomésticos", "Videojuegos", "Otros"];
const state = { data: [], cat: "Todas", soloErr: false, verOcultas: false };

// ---------- Utilidades ----------
const $ = (id) => document.getElementById(id);
const money = (n) =>
  n == null || n === "" ? "" :
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(n));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");
const toDate = (t) => new Date(String(t).replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));

function ago(t) {
  const m = Math.round((Date.now() - toDate(t)) / 60000);
  if (isNaN(m)) return "";
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function catOf(c) {
  const s = (c || "").toLowerCase();
  if (/celular|tel[eé]fono|smartphone|iphone/.test(s)) return "Celulares";
  if (/videojuego|consola|juego|gaming/.test(s)) return "Videojuegos";
  if (/electrodom|l[ií]nea blanca|refri|lavadora|cocina/.test(s)) return "Electrodomésticos";
  if (/electr[oó]nic|c[oó]mputo|laptop|pantalla|tv|audio|tecnolog/.test(s)) return "Electrónica";
  return "Otros";
}

function showBanner(t) {
  $("banner").hidden = !t;
  $("banner").textContent = t || "";
}

// ---------- Sesión ----------
async function mostrarVista() {
  const { data: { session } } = await supabase.auth.getSession();
  $("vistaCarga").hidden = true;
  $("vistaLogin").hidden = !!session;
  $("vistaApp").hidden = !session;
  if (session) cargar();
}

$("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("btnLogin").disabled = true;
  $("loginMsg").textContent = "Entrando…";
  const { error } = await supabase.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value,
  });
  $("btnLogin").disabled = false;
  if (error) {
    $("loginMsg").textContent = "No se pudo entrar: revisa tu correo y contraseña.";
    return;
  }
  $("loginMsg").textContent = "";
  mostrarVista();
});

$("btnSalir").onclick = async () => {
  await supabase.auth.signOut();
  mostrarVista();
};

// ---------- Datos ----------
async function cargar() {
  $("btnRef").disabled = true;
  const { data, error } = await supabase
    .from("ofertas_alerta")
    .select("*")
    .order("creado", { ascending: false })
    .limit(200);
  $("btnRef").disabled = false;

  if (error) {
    $("list").innerHTML = "";
    showBanner("No pude leer las ofertas: " + error.message);
    return;
  }
  state.data = data || [];
  if (!state.data.length) {
    const { data: esAdmin } = await supabase.rpc("radar_es_admin");
    showBanner(esAdmin === false
      ? "Tu cuenta todavía no tiene permiso para ver el radar. Agrega tu correo a la tabla radar_admins en Supabase."
      : "");
  } else {
    showBanner("");
  }
  render();
  $("sub").textContent = `Actualizado ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
}

async function cambiarEstado(id, estado) {
  const o = state.data.find((x) => String(x.id) === String(id));
  if (o) { o.estado = estado; render(); }
  const { error } = await supabase.from("ofertas_alerta").update({ estado }).eq("id", id);
  if (error) showBanner("No se pudo guardar: " + error.message);
}

// ---------- Interfaz ----------
function renderChips() {
  $("chips").innerHTML =
    CATS.map((c) => `<button class="chip ${c === state.cat ? "on" : ""}" data-c="${c}">${c}</button>`).join("") +
    `<label class="toggle"><input type="checkbox" id="onlyErr" ${state.soloErr ? "checked" : ""}> Solo errores</label>` +
    `<label class="toggle"><input type="checkbox" id="showHid" ${state.verOcultas ? "checked" : ""}> Ver descartadas</label>`;
  $("chips").querySelectorAll(".chip").forEach((b) => (b.onclick = () => { state.cat = b.dataset.c; render(); }));
  $("onlyErr").onchange = (e) => { state.soloErr = e.target.checked; render(); };
  $("showHid").onchange = (e) => { state.verOcultas = e.target.checked; render(); };
}

function tarjeta(o) {
  const detalles = o.detalles
    ? `<details class="specs"><summary>Características</summary><ul>${String(o.detalles)
        .split(" · ").map((d) => `<li>${esc(d)}</li>`).join("")}</ul></details>`
    : "";
  return `
  <article class="card ${o.es_error ? "error" : ""} ${["descartada", "comprada"].includes(o.estado) ? "dim" : ""}">
    <div class="top">
      <span class="tag ${o.es_error ? "err" : "low"}">${o.es_error ? "🚨 Error de precio" : "🔥 Precio muy bajo"}</span>
      <span class="ago">${ago(o.creado)}</span>
    </div>
    <div class="prod">${esc(o.producto)}</div>
    <div class="meta">🏬 ${esc(o.tienda)} · ${esc(o.categoria || "General")}${o.estado === "comprada" ? " · ✅ Comprada" : ""}</div>
    <div class="price">
      <span class="now">${money(o.precio)}</span>
      ${o.precio_normal ? `<span class="was">${money(o.precio_normal)}</span>` : ""}
      ${o.descuento ? `<span class="off">-${o.descuento}%</span>` : ""}
    </div>
    ${o.condicion ? `<div class="cond">💳 ${esc(o.condicion)}</div>` : ""}
    ${detalles}
    ${o.nota ? `<div class="nota">⚠️ ${esc(o.nota)}</div>` : ""}
    <a class="go" href="${esc(safeUrl(o.url_tienda))}" target="_blank" rel="noopener">Ir a la tienda →</a>
    <div class="row">
      ${o.url_fuente ? `<a href="${esc(safeUrl(o.url_fuente))}" target="_blank" rel="noopener">Ver fuente</a>` : ""}
      <span class="sp"></span>
      <button class="mini" data-id="${o.id}" data-e="comprada">✅ La compré</button>
      <button class="mini" data-id="${o.id}" data-e="${o.estado === "descartada" ? "nueva" : "descartada"}">${o.estado === "descartada" ? "↩︎ Restaurar" : "✕ Descartar"}</button>
    </div>
  </article>`;
}

function render() {
  renderChips();
  const { data } = state;
  const hoy = new Date().toDateString();
  $("sHoy").textContent = data.filter((o) => toDate(o.creado).toDateString() === hoy).length;
  $("sErr").textContent = data.filter((o) => o.es_error).length;
  const mx = Math.max(0, ...data.map((o) => o.descuento || 0));
  $("sMax").textContent = mx ? `-${mx}%` : "–";

  const rows = data.filter((o) =>
    (state.cat === "Todas" || catOf(o.categoria) === state.cat) &&
    (!state.soloErr || o.es_error) &&
    (state.verOcultas || o.estado !== "descartada"));

  if (!rows.length) {
    $("list").innerHTML = `<div class="empty">📡 Todavía no hay ofertas aquí.</div>`;
    return;
  }
  $("list").innerHTML = `<div class="grid">${rows.map(tarjeta).join("")}</div>`;
  $("list").querySelectorAll(".mini").forEach((b) => (b.onclick = () => cambiarEstado(b.dataset.id, b.dataset.e)));
}

// ---------- WhatsApp ----------
async function abrirConfig() {
  $("cfgMsg").textContent = "";
  $("dlg").showModal();
  const { data, error } = await supabase.rpc("radar_leer_config");
  if (error) { $("cfgMsg").textContent = "No pude leer la configuración."; return; }
  const c = Array.isArray(data) ? data[0] : data;
  $("tel").value = c?.telefono || "";
  $("key").value = "";
  $("key").placeholder = c?.tiene_key ? "•••••• (guardada, escribe para cambiarla)" : "123456";
  $("act").checked = c ? c.activo : true;
}

async function guardarConfig() {
  const tel = $("tel").value.trim().replace(/[^\d+]/g, "");
  if (!/^\+\d{10,15}$/.test(tel)) {
    $("cfgMsg").textContent = "Escribe el número con + y lada, ej. +5215512345678";
    return false;
  }
  const { error } = await supabase.rpc("radar_guardar_config", {
    p_telefono: tel, p_apikey: $("key").value.trim(), p_activo: $("act").checked,
  });
  if (error) { $("cfgMsg").textContent = "Error: " + error.message; return false; }
  $("cfgMsg").textContent = "✅ Guardado";
  return true;
}

$("btnCfg").onclick = abrirConfig;
$("btnClose").onclick = () => $("dlg").close();
$("btnSave").onclick = guardarConfig;
$("btnTest").onclick = async () => {
  if (!(await guardarConfig())) return;
  const { data, error } = await supabase.rpc("radar_probar_whatsapp");
  $("cfgMsg").textContent = error ? "Error: " + error.message : `📲 ${data} — revisa tu WhatsApp en unos segundos.`;
};
$("btnRef").onclick = cargar;

// ---------- Inicio ----------
supabase.auth.onAuthStateChange((evento) => {
  if (evento === "SIGNED_OUT") mostrarVista();
});
mostrarVista();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
