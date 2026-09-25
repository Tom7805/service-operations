# Build context: ./frontend (xem docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# nginx.conf nam o docker/frontend (ngoai build context ./frontend) — lay qua
# additional_contexts "nginxconf" khai bao trong docker-compose.yml.
COPY --from=nginxconf nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
