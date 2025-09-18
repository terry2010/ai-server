FROM postgres:14-alpine
ENV POSTGRES_USER=ai POSTGRES_PASSWORD=ai_pass POSTGRES_DB=ai_db
HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD pg_isready -U $POSTGRES_USER || exit 1
