# VPFS - Sistema de Verificación Prevuelo

Sistema completo de gestión y verificación de aeronaves y pilotos con backend Node.js, soporte para SQLite y MySQL, y frontend moderno.

## 🚀 Características

- ✅ **Autenticación JWT** - Inicio de sesión seguro con tokens
- ✅ **Base de Datos** - SQLite para desarrollo, MySQL/MariaDB para producción
- ✅ **API RESTful** - Backend completo con Express.js
- ✅ **Control de Acceso** - Roles de administrador y solo consulta
- ✅ **Gestión de Usuarios** - CRUD completo (solo administradores)
- ✅ **Gestión de Aeronaves** - Verificación de certificados y deudas
- ✅ **Gestión de Pilotos** - Verificación de licencias y certificados médicos
- ✅ **Dashboard** - Estadísticas en tiempo real
- ✅ **Diseño Moderno** - Interfaz oscura y profesional

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 14 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene con Node.js)

Para verificar si los tienes instalados:

```bash
node --version
npm --version
```

## 🔧 Instalación

### 1. Instalar Node.js

Si no tienes Node.js instalado:

1. Ve a [https://nodejs.org/](https://nodejs.org/)
2. Descarga la versión LTS (recomendada)
3. Ejecuta el instalador
4. Reinicia tu terminal/PowerShell

### 2. Instalar Dependencias del Backend

Abre PowerShell o Terminal en la carpeta del proyecto y ejecuta:

```bash
cd server
npm install
```

Esto instalará todas las dependencias necesarias:
- express
- sequelize
- sqlite3 (para desarrollo local)
- mysql2 (para producción/cPanel)
- bcrypt
- jsonwebtoken
- cors
- dotenv

### 3. Iniciar el Servidor Backend

Desde la carpeta `server`:

```bash
npm start
```

O para modo desarrollo con auto-reload:

```bash
npm run dev
```

Verás un mensaje como:

```
==================================================
✈️  Aviation Management System - Backend API
==================================================
🚀 Server running on port 3000
📍 API URL: http://localhost:3000/api
🏥 Health check: http://localhost:3000/api/health
==================================================
```

### 4. Abrir el Frontend

Con el servidor corriendo, abre el archivo `index.html` en tu navegador:

- Puedes hacer doble clic en `index.html`
- O usar un servidor local como Live Server en VS Code

## 🔐 Credenciales por Defecto

- **Usuario**: `admin`
- **Contraseña**: `admin123`

> ⚠️ **Importante**: Cambia estas credenciales en producción.

## 📁 Estructura del Proyecto

```
Antigravity/
├── server/                    # Backend
│   ├── config/
│   │   └── database.js       # Configuración de base de datos
│   ├── models/
│   │   ├── User.js           # Modelo de usuarios
│   │   ├── Aircraft.js       # Modelo de aeronaves
│   │   ├── Pilot.js          # Modelo de pilotos
│   │   └── index.js          # Inicialización de modelos
│   ├── routes/
│   │   ├── auth.js           # Rutas de autenticación
│   │   ├── users.js          # Rutas de usuarios
│   │   ├── aircraft.js       # Rutas de aeronaves
│   │   └── pilots.js         # Rutas de pilotos
│   ├── middleware/
│   │   ├── auth.js           # Middleware de autenticación
│   │   ├── authorize.js      # Middleware de autorización
│   │   └── validate.js       # Middleware de validación
│   ├── .env                  # Variables de entorno
│   ├── .env.example          # Ejemplo de variables
│   ├── package.json          # Dependencias
│   └── server.js             # Servidor principal
│
├── index.html                # Página principal
├── styles.css                # Estilos
├── api.js                    # Cliente API
├── auth.js                   # Módulo de autenticación
├── users.js                  # Módulo de usuarios
├── aircraft.js               # Módulo de aeronaves
├── pilots.js                 # Módulo de pilotos
└── app.js                    # Aplicación principal
```

## 🔌 API Endpoints

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Usuarios (Solo Admin)

- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Aeronaves

- `GET /api/aircraft` - Listar aeronaves
- `GET /api/aircraft/stats` - Estadísticas
- `GET /api/aircraft/:id` - Obtener aeronave
- `POST /api/aircraft` - Crear aeronave (Admin)
- `PUT /api/aircraft/:id` - Actualizar aeronave (Admin)
- `DELETE /api/aircraft/:id` - Eliminar aeronave (Admin)

### Pilotos

- `GET /api/pilots` - Listar pilotos
- `GET /api/pilots/stats` - Estadísticas
- `GET /api/pilots/:id` - Obtener piloto
- `POST /api/pilots` - Crear piloto (Admin)
- `PUT /api/pilots/:id` - Actualizar piloto (Admin)
- `DELETE /api/pilots/:id` - Eliminar piloto (Admin)

## 🗄️ Base de Datos

El sistema soporta **dos tipos de bases de datos**:

### SQLite (Desarrollo Local)

Por defecto, el sistema usa SQLite que crea un archivo `database.sqlite` en la carpeta `server`.

**Ventajas:**
- ✅ No requiere instalación de servidor de base de datos
- ✅ Archivo único y portable
- ✅ Perfecto para desarrollo y pruebas locales
- ✅ Configuración cero

### MySQL/MariaDB (Producción/cPanel)

**Recomendado para producción** especialmente en hosting compartido como cPanel.

**Ventajas:**
- ✅ Compatible con todos los servicios de hosting (cPanel, Hostinger, etc.)
- ✅ Mejor rendimiento en producción
- ✅ Escalable y robusto
- ✅ Soporte completo en la industria

### Migrar de SQLite a MySQL

📖 **Guía completa**: Ver [MYSQL_SETUP.md](MYSQL_SETUP.md) para instrucciones detalladas.

**Pasos rápidos:**

1. Crea una base de datos MySQL en tu hosting (cPanel)
2. Configura las variables de entorno en `server/.env`:

```env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tu_base_de_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
```

3. Ejecuta el script de migración (si tienes datos existentes):

```bash
cd server
node migrate-to-mysql.js
```

4. Reinicia el servidor

> 📚 **Documentación completa** con screenshots y troubleshooting en [MYSQL_SETUP.md](MYSQL_SETUP.md)

## 🔒 Seguridad

El sistema implementa:

- ✅ **Contraseñas hasheadas** con bcrypt
- ✅ **JWT** para autenticación stateless
- ✅ **Validación de datos** en el backend
- ✅ **Control de acceso** basado en roles
- ✅ **CORS** configurado
- ✅ **Protección de rutas** con middleware

## 🧪 Pruebas

### Probar la API con cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Obtener aeronaves (reemplaza TOKEN con el token recibido)
curl http://localhost:3000/api/aircraft \
  -H "Authorization: Bearer TOKEN"
```

### Probar con Postman o Thunder Client

1. Importa la colección de endpoints
2. Haz login para obtener el token
3. Usa el token en el header `Authorization: Bearer TOKEN`

## 📝 Variables de Entorno

Edita el archivo `server/.env`. Ver `server/.env.example` como referencia.

### Para Desarrollo Local (SQLite)

```env
PORT=3000
JWT_SECRET=tu-secreto-super-seguro-aqui
NODE_ENV=development
DB_DIALECT=sqlite
DATABASE_PATH=./database.sqlite
```

### Para Producción (MySQL/cPanel)

```env
PORT=3000
JWT_SECRET=clave-muy-segura-para-produccion
NODE_ENV=production
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=usuario_vpfs_db
DB_USER=usuario_mysql
DB_PASSWORD=contraseña_segura
```

> ⚠️ **Importante**: 
> - Cambia `JWT_SECRET` en producción
> - Nunca subas el archivo `.env` a Git
> - Ver [MYSQL_SETUP.md](MYSQL_SETUP.md) para configurar MySQL en cPanel

## 🚀 Despliegue en Producción

### cPanel/Hosting Compartido

📖 **Sigue la guía completa**: [MYSQL_SETUP.md](MYSQL_SETUP.md)

**Resumen:**
1. Crea base de datos MySQL en cPanel
2. Sube archivos del proyecto por FTP/File Manager
3. Configura variables de entorno (`.env`)
4. Ejecuta `npm install` en el servidor
5. Inicia con `npm start` o usando Node.js App Manager de cPanel

### VPS/Servidor Dedicado

1. Instala Node.js y MySQL
2. Configura variables de entorno
3. Usa MySQL en lugar de SQLite (ver [MYSQL_SETUP.md](MYSQL_SETUP.md))
4. Configura HTTPS con Let's Encrypt
5. Usa PM2 para mantener el servidor corriendo:

```bash
npm install -g pm2
cd server
pm2 start server.js --name vpfs-api
pm2 save
pm2 startup
```

### Frontend

1. Actualiza `api.js` con la URL de tu API en producción
2. Despliega en Netlify, Vercel, o cualquier hosting estático
3. Configura CORS en el backend para permitir tu dominio

## 🛠️ Solución de Problemas

### Error: "npm no se reconoce"

- Instala Node.js desde [nodejs.org](https://nodejs.org/)
- Reinicia tu terminal

### Error: "Cannot find module"

```bash
cd server
npm install
```

### Error: "Port 3000 already in use"

Cambia el puerto en `server/.env`:

```env
PORT=3001
```

### Error de CORS en el frontend

Asegúrate de que el servidor backend esté corriendo y que la URL en `api.js` sea correcta.

## 📚 Tecnologías Utilizadas

### Backend

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM para base de datos
- **SQLite** - Base de datos
- **bcrypt** - Hash de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **cors** - Cross-Origin Resource Sharing

### Frontend

- **HTML5** - Estructura
- **CSS3** - Estilos modernos
- **JavaScript (Vanilla)** - Lógica de aplicación
- **Fetch API** - Comunicación con backend

## 👥 Roles de Usuario

### Administrador

- ✅ Gestionar usuarios
- ✅ Crear, editar y eliminar aeronaves
- ✅ Crear, editar y eliminar pilotos
- ✅ Ver todas las estadísticas

### Solo Consulta

- ✅ Ver aeronaves
- ✅ Ver pilotos
- ✅ Ver estadísticas
- ❌ No puede crear, editar o eliminar

## 📞 Soporte

Para problemas o preguntas:

1. Revisa la sección de solución de problemas
2. Verifica que Node.js y npm estén instalados
3. Asegúrate de que el servidor backend esté corriendo

## 📄 Licencia

ISC

---

**Desarrollado con ❤️ para la gestión de aviación** ✈️
