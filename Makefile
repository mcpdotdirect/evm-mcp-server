# Makefile for EVM MCP Server Docker operations

# Variables
IMAGE_NAME = evm-mcp-server
IMAGE_TAG = latest
CONTAINER_NAME = evm-mcp-server
PORT = 3000

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Build targets
.PHONY: build
build: ## Build the Docker image
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

.PHONY: build-no-cache
build-no-cache: ## Build the Docker image without cache
	docker build --no-cache -t $(IMAGE_NAME):$(IMAGE_TAG) .

.PHONY: build-production
build-production: ## Build the production Docker image
	docker build --target production -t $(IMAGE_NAME):$(IMAGE_TAG) .

# Run targets
.PHONY: run
run: ## Run the Docker container on port 3000
	docker run -d --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME):$(IMAGE_TAG)

.PHONY: run-interactive
run-interactive: ## Run the Docker container interactively
	docker run -it --rm -p $(PORT):3000 $(IMAGE_NAME):$(IMAGE_TAG)

.PHONY: run-detached
run-detached: ## Run the Docker container in detached mode
	docker run -d --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME):$(IMAGE_TAG)

# Stop and clean targets
.PHONY: stop
stop: ## Stop the running container
	docker stop $(CONTAINER_NAME) || true

.PHONY: remove
remove: ## Remove the container
	docker rm $(CONTAINER_NAME) || true

.PHONY: clean
clean: ## Stop and remove the container
	$(MAKE) stop
	$(MAKE) remove

.PHONY: clean-images
clean-images: ## Remove Docker images
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true

# Development targets
.PHONY: dev
dev: ## Build and run for development (interactive)
	$(MAKE) build
	$(MAKE) run-interactive

.PHONY: dev-detached
dev-detached: ## Build and run for development (detached)
	$(MAKE) build
	$(MAKE) run-detached

# Production targets
.PHONY: prod
prod: ## Build production image and run
	$(MAKE) build-production
	$(MAKE) run-detached

# Utility targets
.PHONY: logs
logs: ## Show container logs
	docker logs -f $(CONTAINER_NAME)

.PHONY: shell
shell: ## Access container shell
	docker exec -it $(CONTAINER_NAME) /bin/sh

.PHONY: status
status: ## Show container status
	docker ps -a | grep $(CONTAINER_NAME) || echo "Container not found"

.PHONY: health
health: ## Check container health
	curl -f http://localhost:$(PORT)/health || echo "Health check failed"

# Complete workflow targets
.PHONY: start
start: ## Complete workflow: build and run
	$(MAKE) build
	$(MAKE) run-detached
	@echo "Container started on http://localhost:$(PORT) (HTTP/1.1 with HTTP/2 upgrade support)"
	@echo "Health check: http://localhost:$(PORT)/health"
	@echo "StreamableHTTP endpoint: http://localhost:$(PORT)/streamable"

.PHONY: restart
restart: ## Restart the container
	$(MAKE) clean
	$(MAKE) start

.PHONY: rebuild
rebuild: ## Rebuild and restart the container
	$(MAKE) clean
	$(MAKE) build-no-cache
	$(MAKE) run-detached
	@echo "Container rebuilt and started on http://localhost:$(PORT)"
