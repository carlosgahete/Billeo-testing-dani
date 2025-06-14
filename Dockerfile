# Dockerfile para aplicación Billeo
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Instalar TODAS las dependencias (incluyendo dev) para el build
RUN npm ci

# Copiar código fuente
COPY . .

# Crear directorio para uploads y logs
RUN mkdir -p uploads logs

# Aumentar memoria para el build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build de la aplicación
RUN npm run build

# Limpiar devDependencies después del build
RUN npm ci --only=production && npm cache clean --force

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["npm", "start"] 