# brain2 single-container image. Used by the ModelScope 创空间 (Docker type) and
# anyone who wants the demo without installing Python/Node.
#   docker build -t brain2 . && docker run -p 7860:7860 brain2
# Runs offline (mock provider) on the in-memory store and seeds demo/seed_notes/.
# Set WEAVE_OFFLINE=0 plus a provider key in Settings to use a real model.

FROM node:20-slim AS ui
WORKDIR /ui
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY demo/ demo/
COPY --from=ui /ui/dist frontend/dist
ENV WEAVE_OFFLINE=1 WEAVE_MONGO_URI=mock:// PYTHONUNBUFFERED=1
EXPOSE 7860
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
