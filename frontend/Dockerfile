# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage to populate shared nginx html volume
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "mkdir -p /usr/share/nginx/html && cp -r /dist/* /usr/share/nginx/html/ && tail -f /dev/null"]
