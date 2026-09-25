FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
RUN chmod +x docker/entrypoint.sh
ENV DATABASE_URL=file:/data/proscout.db
ENV AUTH_TRUST_HOST=true
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
VOLUME ["/data"]
CMD ["sh", "docker/entrypoint.sh"]
