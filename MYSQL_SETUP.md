# Configuración de MySQL para cPanel

Esta guía te ayudará a configurar MySQL en tu hosting cPanel y migrar tu aplicación VPFS de SQLite a MySQL.

## ¿Por qué MySQL?

SQLite es excelente para desarrollo local, pero la mayoría de servicios de hosting compartido (cPanel, Hostinger, GoDaddy, etc.) **solo soportan MySQL/MariaDB**. Esta migración garantiza que tu aplicación funcione en cualquier hosting.

## Paso 1: Crear Base de Datos MySQL en cPanel

### 1.1 Acceder a MySQL Database Wizard

1. Inicia sesión en tu panel de cPanel
2. Busca la sección **"Databases"** (Bases de Datos)
3. Haz clic en **"MySQL Database Wizard"** o **"MySQL Databases"**

### 1.2 Crear la Base de Datos

1. **Nombre de la base de datos**: ingresa `vpfs_db` (o el nombre que prefieras)
   - cPanel agregará un prefijo automáticamente (ej: `usuario_vpfs_db`)
   - Anota el nombre completo para usarlo después
2. Haz clic en **"Next Step"** o **"Create Database"**

### 1.3 Crear Usuario MySQL

1. **Usuario**: ingresa un nombre (ej: `vpfs_user`)
2. **Contraseña**: genera una contraseña segura
   - ⚠️ **MUY IMPORTANTE**: Guarda esta contraseña de forma segura
3. Haz clic en **"Create User"**

### 1.4 Asignar Privilegios

1. Selecciona **"ALL PRIVILEGES"** (Todos los privilegios)
2. Haz clic en **"Make Changes"** o **"Add"**

### 1.5 Anotar los Datos de Conexión

Necesitarás estos datos para configurar tu aplicación:

```
DB_HOST: localhost (o la IP proporcionada por tu hosting)
DB_PORT: 3306 (puerto estándar de MySQL)
DB_NAME: usuario_vpfs_db (el nombre completo con prefijo)
DB_USER: usuario_vpfs_user (el usuario completo con prefijo)
DB_PASSWORD: tu_contraseña_segura
```

## Paso 2: Configurar Variables de Entorno

### 2.1 En Desarrollo Local (Opcional)

Si quieres probar MySQL localmente antes de subir a producción:

1. Copia el archivo `.env.example` a `.env`
2. Edita el archivo `.env`:

```env
PORT=3000
JWT_SECRET=tu-clave-secreta-aqui
NODE_ENV=development

# Cambiar a mysql para usar MySQL
DB_DIALECT=mysql

# Configuración MySQL local (si tienes MySQL instalado)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vpfs_db
DB_USER=root
DB_PASSWORD=tu_password
```

### 2.2 En Producción (cPanel)

En tu servidor de producción, crea o edita el archivo `.env`:

```env
PORT=3000
JWT_SECRET=clave-secreta-muy-segura-para-produccion
NODE_ENV=production

# Usar MySQL en producción
DB_DIALECT=mysql

# Datos de MySQL de cPanel (reemplaza con tus datos reales)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=usuario_vpfs_db
DB_USER=usuario_vpfs_user
DB_PASSWORD=tu_contraseña_de_cpanel
```

⚠️ **IMPORTANTE**: Asegúrate de que el archivo `.env` esté en la carpeta `server/` y **NUNCA** lo subas a GitHub.

## Paso 3: Subir Archivos al Servidor

### 3.1 Usando File Manager de cPanel

1. En cPanel, busca **"File Manager"**
2. Navega a `public_html/` o la carpeta de tu aplicación
3. Sube todos los archivos de tu proyecto
4. Asegúrate de subir también la carpeta `node_modules` o ejecutar `npm install` en el servidor

### 3.2 Usando FTP/SFTP

Si prefieres usar un cliente FTP como FileZilla:

1. Conecta a tu servidor usando las credenciales FTP de cPanel
2. Sube todos los archivos del proyecto
3. Conserva la estructura de carpetas

## Paso 4: Instalar Dependencias

Conecta a tu servidor por SSH (si está disponible) o usa el Terminal de cPanel:

```bash
cd public_html/server  # o la ruta donde esté tu proyecto
npm install
```

Esto instalará todas las dependencias incluyendo `mysql2`.

## Paso 5: Migrar Datos (Si ya tienes datos en SQLite)

Si ya tienes datos en SQLite que necesitas migrar:

### 5.1 Preparación

1. Verifica que tu base de datos SQLite (`database.sqlite`) esté en la carpeta `server/`
2. Asegúrate de que el archivo `.env` tenga configuración de MySQL correcta

### 5.2 Ejecutar Migración

```bash
cd server
node migrate-to-mysql.js
```

El script:
- Conectará a ambas bases de datos (SQLite y MySQL)
- Creará las tablas en MySQL
- Copiará todos los datos de SQLite a MySQL
- Mostrará un resumen de la migración

### 5.3 Verificar Migración

El script te mostrará cuántos registros se migraron de cada tabla. Revisa que los números sean correctos.

## Paso 6: Iniciar la Aplicación

### 6.1 Primera Vez (Crear Tablas)

Si es una instalación nueva sin migración de datos:

```bash
cd server
npm start
```

El servidor automáticamente:
- Conectará a MySQL
- Creará todas las tablas necesarias
- Creará el usuario admin por defecto

### 6.2 Usuario Admin por Defecto

```
Usuario: admin
Contraseña: admin123
```

⚠️ **IMPORTANTE**: Cambia esta contraseña inmediatamente después del primer login.

## Paso 7: Verificar que Funciona

### 7.1 Verificar Conexión

Cuando inicies el servidor (`npm start`), deberías ver:

```
✅ Database connection established successfully (MYSQL).
✅ Database synchronized successfully.
✅ Default admin user created with all permissions.
```

### 7.2 Probar API

Verifica que la API funciona:

```bash
curl http://tu-dominio.com:3000/api/health
```

Deberías recibir:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-..."
}
```

## Paso 8: Configurar Proceso en Segundo Plano

Para que tu aplicación siga corriendo:

### Opción A: PM2 (Recomendado)

```bash
npm install -g pm2
cd server
pm2 start server.js --name vpfs
pm2 save
pm2 startup
```

### Opción B: Usar cPanel Node.js Selector

Si tu hosting tiene "Setup Node.js App":
1. Configura la aplicación desde el panel
2. Selecciona la versión de Node.js
3. Define el comando de inicio: `node server.js`

## Troubleshooting

### Error: "Unable to connect to the database"

**Causas comunes:**
- Credenciales incorrectas en `.env`
- El usuario MySQL no tiene permisos
- El host es incorrecto (algunos hostings usan IP específica)

**Solución:**
1. Verifica las credenciales en cPanel > MySQL Databases
2. Asegúrate de usar el nombre completo con prefijo
3. Intenta con `127.0.0.1` en lugar de `localhost`

### Error: "Table doesn't exist"

**Solución:**
1. Asegúrate de que `DB_DIALECT=mysql` en `.env`
2. Reinicia el servidor para que cree las tablas automáticamente
3. O ejecuta `node migrate-to-mysql.js` si estás migrando datos

### Error: "ECONNREFUSED"

**Causas comunes:**
- MySQL no está corriendo
- Puerto incorrecto
- Firewall bloqueando la conexión

**Solución:**
1. Verifica que MySQL esté activo en cPanel
2. Confirma que el puerto sea 3306 (o el que use tu hosting)
3. Contacta a soporte de hosting si persiste

### La migración falla en algunos registros

**Solución:**
1. Revisa los errores específicos que muestra el script
2. Usualmente son problemas de encoding o datos duplicados
3. Puedes ejecutar la migración múltiples veces (saltará registros duplicados)

## Soporte Adicional

Si tienes problemas:
1. Revisa los logs del servidor: `npm start` mostrará errores detallados
2. Verifica que MySQL funcione: `mysql -u usuario_vpfs_user -p` en terminal
3. Contacta al soporte de tu hosting para verificar configuración de MySQL

## Volver a SQLite (Desarrollo Local)

Si quieres volver a SQLite para desarrollo:

```env
# En .env
DB_DIALECT=sqlite
DATABASE_PATH=./database.sqlite
```

Reinicia el servidor y volverá a usar SQLite.
