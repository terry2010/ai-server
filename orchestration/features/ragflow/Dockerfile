FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt || true
EXPOSE 7860 8080
CMD ["python","app.py"]
