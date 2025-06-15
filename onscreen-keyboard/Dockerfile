ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base
RUN \
    apk add --no-cache \
        nginx \
        nodejs \
        npm

# Copy web files
COPY app.js /app/
COPY run.sh /
RUN chmod a+x /run.sh

# Configure nginx
COPY nginx.conf /etc/nginx/nginx.conf

CMD [ "/run.sh" ] 