#!/bin/bash
set -e

echo "Starting Postgres test database..."
docker-compose -f docker-compose.test.yml up -d --wait

echo "Running tests..."
export DATABASE_URL="postgresql://testuser:testpassword@localhost:5432/cityos_test?schema=public"

# Run Prisma migrations if needed
npm run contract:emit

# Run integration tests
npm run test:integration

echo "Tearing down test database..."
docker-compose -f docker-compose.test.yml down
