FROM qdrant/qdrant:latest
EXPOSE 6333
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:6333/healthz | grep -q '"status":"ok"' || exit 1
