FROM redis:7-alpine
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD redis-cli ping | grep PONG || exit 1
