FROM minio/minio:RELEASE.2024-06-13T22-53-52Z
ENV MINIO_ROOT_USER=aiadmin MINIO_ROOT_PASSWORD=aiadmin123
EXPOSE 9000 9001
HEALTHCHECK --interval=10s --timeout=5s --retries=20 CMD wget -qO- http://127.0.0.1:9001/minio/health/ready || exit 1
CMD ["server","/data","--console-address","0.0.0.0:9001"]
