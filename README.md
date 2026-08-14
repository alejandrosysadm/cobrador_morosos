# 🎩 Cobrador de Morosos — Se abre el bote

Web estática (HTML + CSS + JS) para llevar el control del bote: cada uno
consulta su nombre y, si no ha pagado, aparece el cobrador. El pago lo
aprueba el tesorero con contraseña. Hay un modo administrador para
gestionar la lista.

## 🚀 Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `cobrador-morosos`).
2. Sube **todos estos ficheros a la raíz** del repo:
   `index.html`, `style.css`, `script.js`, `imagen.jpg`, `nombres.txt`.
3. En el repo: **Settings → Pages**.
4. En *Build and deployment → Source* elige **Deploy from a branch**.
5. Branch: `main` y carpeta `/ (root)`. Guarda.
6. Espera ~1 minuto. Tu web quedará en:
   `https://TU-USUARIO.github.io/cobrador-morosos/`

## 🕹️ Uso

- **Consultar**: escribe tu nombre (da igual mayúsculas, minúsculas,
  espacios o tildes).
- **Pagar**: si eres moroso, pulsa "Dejar de ser moroso" e introduce la
  contraseña del **tesorero** para aprobar el pago.
- **Administrar**: escribe `administrador` en el comprobador e introduce
  la contraseña de admin. Puedes añadir/quitar nombres y resetear todos
  a "no pagado".

## 🔑 Contraseñas

En `script.js` se guardan como **hash SHA-256** (no en texto plano):

- Administrador: `Moroso$123`
- Tesorero: `Tesorero$123`

Para cambiarlas: calcula el SHA-256 de la nueva contraseña y pega el
resultado en `HASH_ADMIN` o `HASH_TESORERO` dentro de `script.js`.
Puedes generar el hash en cualquier consola:

    # En la consola del navegador (F12):
    crypto.subtle.digest("SHA-256", new TextEncoder().encode("TuNueva"))
      .then(b => console.log(Array.from(new Uint8Array(b))
      .map(x => x.toString(16).padStart(2,"0")).join("")));

## ⚠️ Importante sobre los datos

Al no haber servidor, **los estados (pagado / no pagado) se guardan en el
navegador de cada persona** (localStorage). Esto significa:

- Si Emilio se marca como pagado en SU móvil, tú NO lo verás en TU equipo.
  Cada dispositivo tiene su propia copia.
- `nombres.txt` solo sirve como lista inicial la primera vez.

Si lo que quieres es un bote **compartido y sincronizado** (que todos vean
lo mismo en tiempo real), hace falta una pequeña base de datos online.
Se puede montar gratis con Firebase, Supabase o similar. Dímelo y lo
preparamos.

## 🔒 Nota de seguridad

Es una web pública y estática, pensada como algo divertido entre amigos.
Las contraseñas van con hash para que no se lean a simple vista en el
código, pero un usuario técnico podría saltarse el candado editando el
navegador. No la uses para nada sensible.
