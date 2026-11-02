# Multi-stage Dockerfile for Token World ATS Suite
# Combines FastAPI matching engine, Node.js Express/Vite trading portal, and Foundry tools
# Principal: Mauro Lomibao Dar III

FROM node:20-alpine AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM python:3.11-slim AS production
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    uvicorn[standard]==0.28.0 \
    pydantic==2.6.4 \
    pytest==8.1.1 \
    httpx==0.27.0

# Install Node runtime for full-stack trading portal
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY --from=node-builder /app /app

# Default Regulatory Guardrail: Live trading disabled
ENV ENABLE_LIVE_TRADING=false
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

EXPOSE 3000
EXPOSE 8000

CMD ["sh", "-c", "python3 main.py & npm run start"]
