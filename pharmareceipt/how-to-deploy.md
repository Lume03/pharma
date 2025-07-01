# Cómo Subir tu Proyecto a GitHub

¡Excelente! Subir tu proyecto a GitHub es una excelente manera de guardar tu trabajo, colaborar con otros y crear un portafolio. Sigue estos pasos para hacerlo desde Firebase Studio.

## Paso 1: Inicializa tu Repositorio de Git

Primero, necesitas inicializar un repositorio de Git en tu proyecto. Abre una terminal en la raíz de tu proyecto y ejecuta el siguiente comando:

```bash
git init
```

## Paso 2: Agrega los Archivos y Haz tu Primer Commit

A continuación, agrega todos los archivos de tu proyecto al área de preparación (staging) y realiza tu primer "commit" (una instantánea de tu código).

```bash
# Agrega todos los archivos al staging
git add .

# Crea tu primer commit con un mensaje descriptivo
git commit -m "Primer commit: Proyecto PharmaReceipt AI inicial"
```

> **Nota:** He creado un archivo `.gitignore` por ti. Este archivo le dice a Git qué carpetas y archivos debe ignorar, como `node_modules` o archivos de entorno, para que no se suban a tu repositorio.

## Paso 3: Crea un Nuevo Repositorio en GitHub

1.  Ve a [GitHub.com](https://github.com) e inicia sesión.
2.  Haz clic en el signo **"+"** en la esquina superior derecha y selecciona **"New repository"**.
3.  Dale un nombre a tu repositorio (por ejemplo, `pharma-receipt-ai`).
4.  Puedes añadir una descripción si lo deseas.
5.  Asegúrate de que el repositorio sea **Público** o **Privado**, según tu preferencia.
6.  **¡Muy importante!** No selecciones "Initialize this repository with a README", ".gitignore", o una licencia. Ya tienes estos archivos en tu proyecto local.
7.  Haz clic en **"Create repository"**.

## Paso 4: Conecta tu Repositorio Local con GitHub

GitHub te mostrará una página con varios comandos. Busca la sección que dice **"…or push an existing repository from the command line"** y copia los comandos. Serán algo así:

```bash
# Reemplaza la URL con la de tu propio repositorio
git remote add origin https://github.com/tu-usuario/tu-repositorio.git

# Verifica que la conexión se haya establecido correctamente
git remote -v
```

El primer comando conecta tu proyecto local con el repositorio remoto que acabas de crear en GitHub.

## Paso 5: Sube tu Código a GitHub

Finalmente, sube (push) tu commit a GitHub. Como es la primera vez, necesitarás especificar la rama principal (`main`).

```bash
git branch -M main
git push -u origin main
```

¡Y listo! Si ahora refrescas la página de tu repositorio en GitHub, verás todos los archivos de tu proyecto.

De ahora en adelante, cada vez que hagas cambios, solo necesitarás ejecutar:

```bash
# 1. Agrega los cambios
git add .

# 2. Haz un commit
git commit -m "Descripción de los cambios que hiciste"

# 3. Sube los cambios a GitHub
git push origin main
```
