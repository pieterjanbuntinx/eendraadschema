# Bouwt eendraadschema en serveert het via nginx op /eendraadschema/.
# De rest van de website (/) komt uit een volume op /usr/share/nginx/html.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build \
 && mkdir /out \
 && cp -r builddate.js css Documentation examples favicon.ico gif license.html prop resources /out/ \
 && cp dist/index.html /out/index.html

FROM nginx:alpine
COPY --from=build /out /usr/share/nginx/eendraadschema
COPY docker/default.conf /etc/nginx/conf.d/default.conf
