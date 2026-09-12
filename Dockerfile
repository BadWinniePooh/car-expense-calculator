# The app is plain HTML, CSS and ES modules — there is nothing to compile, so
# this is a single stage: take nginx, drop the files in, serve them.
FROM nginx:1.28-alpine

# Serve as the unprivileged `nginx` user (uid 101) that the base image already
# ships. That needs the pid file somewhere writable and the cache and config
# directories owned by that user.
RUN set -eux; \
    sed -i 's|^pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf; \
    rm -f /etc/nginx/conf.d/default.conf; \
    chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d

COPY docker/nginx.conf /etc/nginx/conf.d/app.conf
COPY index.html        /usr/share/nginx/html/index.html
COPY assets/           /usr/share/nginx/html/assets/
COPY src/              /usr/share/nginx/html/src/

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/healthz || exit 1

# Inherited from the base image, repeated here so it is visible:
# CMD ["nginx", "-g", "daemon off;"]
