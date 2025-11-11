# 🚀 Configuración de GitHub Pages

## ✅ Archivos Creados

He creado los siguientes archivos para habilitar GitHub Pages:

1. **`docs/index.html`** - Landing page principal
2. **`.github/workflows/pages.yml`** - Workflow de GitHub Actions para deploy automático
3. **`docs/_config.yml`** - Configuración de Jekyll (opcional)

## 📋 Pasos para Activar GitHub Pages

### Paso 1: Activar GitHub Pages en el Repositorio

1. Ve a tu repositorio: https://github.com/alex9abril/localia-admin
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, busca **Pages** (páginas)
4. En **Source** (Origen), selecciona:
   - **Source:** `GitHub Actions`
5. Guarda los cambios

### Paso 2: Verificar el Workflow

1. Ve a la pestaña **Actions** en tu repositorio
2. Deberías ver el workflow "Deploy GitHub Pages"
3. Si no se ejecuta automáticamente, haz clic en "Run workflow"

### Paso 3: Acceder a tu Landing Page

Una vez desplegado, tu landing page estará disponible en:
```
https://alex9abril.github.io/localia-admin/
```

O si usas un dominio personalizado:
```
https://tu-dominio.com
```

## 🎨 Características de la Landing Page

La landing page incluye:

- ✨ **Header atractivo** con gradiente verde
- 📊 **Sección de características** principales
- 📅 **Información del Gantt** y plan de desarrollo
- 📚 **Grid de documentación** con enlaces a todos los documentos
- 📱 **Diseño responsive** (se adapta a móviles)
- 🎯 **Call-to-actions** claros

## 🔄 Actualización Automática

Cada vez que hagas `git push` a la rama `main`, GitHub Pages se actualizará automáticamente gracias al workflow de GitHub Actions.

## 🛠️ Personalización

Puedes personalizar la landing page editando:
- **`docs/index.html`** - Contenido y diseño
- **Colores:** Edita las variables CSS en `:root`
- **Contenido:** Modifica las secciones HTML

## 📝 Notas

- La landing page está en `docs/index.html`
- Los documentos Markdown se pueden acceder directamente desde la landing page
- GitHub Pages soporta Markdown, así que los `.md` se renderizarán automáticamente
- El diagrama Mermaid del Gantt se renderizará si GitHub Pages tiene soporte para Mermaid

## 🔗 Enlaces Útiles

- [Documentación de GitHub Pages](https://docs.github.com/en/pages)
- [GitHub Actions para Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)

---

**¡Listo!** Una vez que actives GitHub Pages, tu landing page estará disponible públicamente.

