/* =====================================================================
   COBRADOR DE MOROSOS  ·  versión estática (HTML + CSS + JS)
   ---------------------------------------------------------------------
   Sin servidor: los datos se guardan en el navegador (localStorage).
   La lista inicial se carga de nombres.txt (o de la lista de reserva
   de abajo si no se puede leer el fichero).
   ===================================================================== */

// ------- Lista de reserva por si no se puede leer nombres.txt -------
const LISTA_POR_DEFECTO = [
    "Emilio", "Miguel", "Jose", "Alejandro", "Hector", "Ricardo",
    "Slava", "Franco", "Nikita", "Claudia", "Javier Garcia", "Javier Clemente"
];

// ------- Contraseñas (guardadas como hash SHA-256, no en texto) -------
//   Administrador: Moroso$123
//   Tesorero:      Tesorero$123
// Para cambiarlas: calcula el SHA-256 de la nueva y pega el hash aquí.
const HASH_ADMIN    = "492ede2b94cd97d9c1c8fa268f48c0881331e11822ecdef0e6d2db085cbbe885";
const HASH_TESORERO = "eefb7aeb5a589c008f524029a46b1eb29ca6770ab5cd2ce174b18237480d5205";

const CLAVE_STORAGE = "cobrador_morosos";

// ================== Referencias ==================
const vistas = {
    login:      document.getElementById("vista-login"),
    moroso:     document.getElementById("vista-moroso"),
    pagado:     document.getElementById("vista-pagado"),
    adminPass:  document.getElementById("vista-admin-pass"),
    adminPanel: document.getElementById("vista-admin-panel"),
};

const inputNombre  = document.getElementById("input-nombre");
const btnComprobar = document.getElementById("btn-comprobar");
const mensajeError = document.getElementById("mensaje-error");

const btnPagar        = document.getElementById("btn-pagar");
const zonaTesorero    = document.getElementById("zona-tesorero");
const inputTesorero   = document.getElementById("input-tesorero");
const btnConfirmarPago= document.getElementById("btn-confirmar-pago");
const btnCancelarPago = document.getElementById("btn-cancelar-pago");
const errorTesorero   = document.getElementById("error-tesorero");
const nombreMoroso    = document.getElementById("nombre-moroso");
const btnVolverMoroso = document.getElementById("btn-volver-moroso");

const nombreOk  = document.getElementById("nombre-ok");
const btnVolver = document.getElementById("btn-volver");

const inputAdminPass  = document.getElementById("input-admin-pass");
const btnAdminLogin   = document.getElementById("btn-admin-login");
const errorAdminPass  = document.getElementById("error-admin-pass");
const btnVolverAdminPass = document.getElementById("btn-volver-admin-pass");

const listaAdmin       = document.getElementById("lista-admin");
const inputNuevoNombre = document.getElementById("input-nuevo-nombre");
const btnAnadir        = document.getElementById("btn-anadir");
const btnResetear      = document.getElementById("btn-resetear");
const btnSalirAdmin    = document.getElementById("btn-salir-admin");
const errorAdminPanel  = document.getElementById("error-admin-panel");

let nombreActual = "";
let adminOk = false;

// ================== Datos (localStorage) ==================
// Estructura guardada: [{ nombre: "Emilio", pagado: false }, ...]
function cargarDatos() {
    try {
        const raw = localStorage.getItem(CLAVE_STORAGE);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}
function guardarDatos(datos) {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
}

let DATOS = []; // se rellena al iniciar

async function iniciarDatos() {
    const guardado = cargarDatos();
    if (guardado && Array.isArray(guardado) && guardado.length) {
        DATOS = guardado;
        return;
    }
    // Primera vez: intentar leer nombres.txt; si falla, usar lista por defecto
    let nombres = LISTA_POR_DEFECTO;
    try {
        const res = await fetch("nombres.txt");
        if (res.ok) {
            const txt = await res.text();
            const leidos = txt.split("\n")
                .map(l => l.trim())
                .filter(Boolean)
                .map(l => l.split(";")[0].trim())
                .filter(Boolean);
            if (leidos.length) nombres = leidos;
        }
    } catch (e) { /* file:// o sin conexión -> usamos la lista por defecto */ }

    DATOS = nombres.map(n => ({ nombre: n, pagado: false }));
    guardarDatos(DATOS);
}

// ================== Utilidades ==================
function normalizar(texto) {
    if (!texto) return "";
    return texto
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin acentos
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");                         // sin espacios ni símbolos
}

function buscarIndice(nombre) {
    const objetivo = normalizar(nombre);
    return DATOS.findIndex(r => normalizar(r.nombre) === objetivo);
}

async function sha256(texto) {
    // Requiere contexto seguro (https o localhost). GitHub Pages es https.
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function mostrar(vista) {
    Object.values(vistas).forEach(v => v.classList.remove("activa"));
    void vista.offsetWidth;
    vista.classList.add("activa");
}

function sacudir(el) {
    el.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" },
         { transform: "translateX(8px)" }, { transform: "translateX(-5px)" },
         { transform: "translateX(0)" }],
        { duration: 350, easing: "ease-in-out" }
    );
}

// ================== Comprobar nombre ==================
function comprobar() {
    const nombre = inputNombre.value;
    mensajeError.textContent = "";

    if (!nombre.trim()) {
        mensajeError.textContent = "Escribe tu nombre, moroso 😏";
        sacudir(inputNombre);
        return;
    }

    if (normalizar(nombre) === "administrador") {
        inputAdminPass.value = "";
        errorAdminPass.textContent = "";
        mostrar(vistas.adminPass);
        inputAdminPass.focus();
        return;
    }

    const idx = buscarIndice(nombre);
    if (idx === -1) {
        mensajeError.textContent = `"${nombre.trim()}" no está en la lista del bote.`;
        sacudir(vistas.login);
        return;
    }

    nombreActual = DATOS[idx].nombre;
    if (DATOS[idx].pagado) {
        nombreOk.textContent = nombreActual;
        mostrar(vistas.pagado);
        lanzarConfeti();
    } else {
        nombreMoroso.textContent = nombreActual;
        cerrarZonaTesorero();
        mostrar(vistas.moroso);
    }
}

// ================== Flujo tesorero (pagar) ==================
function abrirZonaTesorero() {
    zonaTesorero.classList.add("abierta");
    btnPagar.style.display = "none";
    errorTesorero.textContent = "";
    inputTesorero.value = "";
    setTimeout(() => inputTesorero.focus(), 200);
}
function cerrarZonaTesorero() {
    zonaTesorero.classList.remove("abierta");
    btnPagar.style.display = "";
    errorTesorero.textContent = "";
    inputTesorero.value = "";
}

async function confirmarPago() {
    const password = inputTesorero.value;
    errorTesorero.textContent = "";
    if (!password) {
        errorTesorero.textContent = "Introduce la contraseña del tesorero.";
        sacudir(inputTesorero);
        return;
    }
    btnConfirmarPago.classList.add("cargando");
    try {
        const hash = await sha256(password);
        if (hash !== HASH_TESORERO) {
            errorTesorero.textContent = "❌ Contraseña del tesorero incorrecta.";
            sacudir(zonaTesorero);
            return;
        }
        const idx = buscarIndice(nombreActual);
        if (idx !== -1) {
            DATOS[idx].pagado = true;
            guardarDatos(DATOS);
        }
        nombreOk.textContent = nombreActual;
        mostrar(vistas.pagado);
        lanzarConfeti();
    } catch (e) {
        errorTesorero.textContent = "No se pudo verificar la contraseña en este navegador.";
    } finally {
        btnConfirmarPago.classList.remove("cargando");
    }
}

// ================== Volver ==================
function volverInicio() {
    inputNombre.value = "";
    mensajeError.textContent = "";
    nombreActual = "";
    mostrar(vistas.login);
    inputNombre.focus();
}

// ================== Admin ==================
async function adminLogin() {
    const password = inputAdminPass.value;
    errorAdminPass.textContent = "";
    if (!password) {
        errorAdminPass.textContent = "Introduce la contraseña.";
        sacudir(inputAdminPass);
        return;
    }
    btnAdminLogin.classList.add("cargando");
    try {
        const hash = await sha256(password);
        if (hash !== HASH_ADMIN) {
            errorAdminPass.textContent = "❌ Contraseña incorrecta.";
            sacudir(vistas.adminPass);
            return;
        }
        adminOk = true;
        pintarListaAdmin();
        mostrar(vistas.adminPanel);
    } catch (e) {
        errorAdminPass.textContent = "No se pudo verificar la contraseña en este navegador.";
    } finally {
        btnAdminLogin.classList.remove("cargando");
    }
}

function escapar(txt) {
    const d = document.createElement("div");
    d.textContent = txt;
    return d.innerHTML;
}

function pintarListaAdmin() {
    errorAdminPanel.textContent = "";
    listaAdmin.innerHTML = "";
    if (DATOS.length === 0) {
        listaAdmin.innerHTML = '<p style="padding:16px;color:#8b91a8">No hay nombres en la lista.</p>';
        return;
    }
    DATOS.forEach((r) => {
        const fila = document.createElement("div");
        fila.className = "fila-persona";
        fila.innerHTML = `
            <span class="nombre-lista">${escapar(r.nombre)}</span>
            <span class="etiqueta ${r.pagado ? "si" : "no"}">${r.pagado ? "PAGADO" : "NO PAGADO"}</span>
            <button class="btn-quitar" title="Quitar">✕</button>
        `;
        fila.querySelector(".btn-quitar").addEventListener("click", () => quitarNombre(r.nombre));
        listaAdmin.appendChild(fila);
    });
}

function anadirNombre() {
    if (!adminOk) return;
    const nombre = inputNuevoNombre.value.trim();
    errorAdminPanel.textContent = "";
    if (!nombre) {
        errorAdminPanel.textContent = "Escribe un nombre.";
        sacudir(inputNuevoNombre);
        return;
    }
    if (buscarIndice(nombre) !== -1) {
        errorAdminPanel.textContent = `"${nombre}" ya está en la lista.`;
        return;
    }
    DATOS.push({ nombre, pagado: false });
    guardarDatos(DATOS);
    inputNuevoNombre.value = "";
    pintarListaAdmin();
}

function quitarNombre(nombre) {
    if (!adminOk) return;
    if (!confirm(`¿Quitar a "${nombre}" de la lista?`)) return;
    const idx = buscarIndice(nombre);
    if (idx !== -1) {
        DATOS.splice(idx, 1);
        guardarDatos(DATOS);
        pintarListaAdmin();
    }
}

function resetearTodos() {
    if (!adminOk) return;
    if (!confirm("¿Poner a TODOS en 'no pagado'? (se abre el bote de cero)")) return;
    DATOS.forEach(r => r.pagado = false);
    guardarDatos(DATOS);
    pintarListaAdmin();
}

function salirAdmin() {
    adminOk = false;
    volverInicio();
}

// ================== Confeti ==================
function lanzarConfeti() {
    const canvas = document.getElementById("confeti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colores = ["#e8c46a", "#34d97b", "#ffffff", "#f6d67d", "#45f08a"];
    const piezas = [];
    for (let i = 0; i < 160; i++) {
        piezas.push({
            x: Math.random() * canvas.width, y: Math.random() * -canvas.height,
            r: Math.random() * 7 + 3, color: colores[Math.floor(Math.random() * colores.length)],
            vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3 + 2,
            giro: Math.random() * 360, vGiro: (Math.random() - 0.5) * 12
        });
    }
    let frames = 0;
    function dibujar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        piezas.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.giro += p.vGiro;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.giro * Math.PI) / 180);
            ctx.fillStyle = p.color; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
            ctx.restore();
        });
        frames++;
        if (frames < 220) requestAnimationFrame(dibujar);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    dibujar();
}

// ================== Eventos ==================
btnComprobar.addEventListener("click", comprobar);
inputNombre.addEventListener("keydown", e => { if (e.key === "Enter") comprobar(); });

btnPagar.addEventListener("click", abrirZonaTesorero);
btnCancelarPago.addEventListener("click", cerrarZonaTesorero);
btnConfirmarPago.addEventListener("click", confirmarPago);
inputTesorero.addEventListener("keydown", e => { if (e.key === "Enter") confirmarPago(); });
btnVolverMoroso.addEventListener("click", volverInicio);

btnVolver.addEventListener("click", volverInicio);

btnAdminLogin.addEventListener("click", adminLogin);
inputAdminPass.addEventListener("keydown", e => { if (e.key === "Enter") adminLogin(); });
btnVolverAdminPass.addEventListener("click", volverInicio);

btnAnadir.addEventListener("click", anadirNombre);
inputNuevoNombre.addEventListener("keydown", e => { if (e.key === "Enter") anadirNombre(); });
btnResetear.addEventListener("click", resetearTodos);
btnSalirAdmin.addEventListener("click", salirAdmin);

// ================== Arranque ==================
iniciarDatos().then(() => inputNombre.focus());
