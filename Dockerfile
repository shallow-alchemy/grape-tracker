# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file
COPY schema.cjs /app/schema.cjs

# Set working directory
WORKDIR /app

# Install @rocicorp/zero so zero-deploy-permissions can load the schema
RUN npm install @rocicorp/zero

# Zero runs on port 4848
EXPOSE 4848

# Deploy permissions then start zero-cache
CMD ["sh", "-c", "zero-deploy-permissions --schema-path /app/schema.cjs --upstream-db \"$ZERO_UPSTREAM_DB\" && zero-cache --schema-path /app/schema.cjs"]
