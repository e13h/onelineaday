FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine as backend

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/server.ts ./src/
COPY tsconfig*.json ./

CMD ["npm", "run", "backend"]

FROM nginx:alpine as frontend

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
