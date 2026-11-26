FROM nginx:1.28-alpine
ARG SOURCE_REV=sin-identificar
LABEL org.opencontainers.image.revision=$SOURCE_REV
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY browser-cierre/ /usr/share/nginx/html/
