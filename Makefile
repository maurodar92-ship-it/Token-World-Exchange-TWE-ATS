.PHONY: run test web docker help

help:
	@echo "Token World Institutional Sandbox Commands:"
	@echo "  make run    - Start FastAPI backend (uvicorn app.main:app --port 8000)"
	@echo "  make test   - Run test suite (pytest -q)"
	@echo "  make web    - Start frontend static sandbox (port 5000)"
	@echo "  make docker - Build and launch docker compose infrastructure"

run:
	cd backend && uvicorn app.main:app --reload --port 8000

test:
	cd backend && pytest -q

web:
	cd frontend && python -m http.server 5000

docker:
	docker compose -f infra/docker-compose.yml up --build
