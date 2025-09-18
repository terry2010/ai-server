FROM getmeili/meilisearch:latest
EXPOSE 7700
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:7700/health | grep -q 'status' || exit 1
