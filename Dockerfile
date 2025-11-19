# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file
COPY schema.cjs /app/schema.cjs

# Set working directory
WORKDIR /app

# Zero runs on port 4848
EXPOSE 4848

# Start zero-cache with all required flags
CMD ["sh", "-c", "echo 'Container started' && echo 'Running zero-cache...' && exec zero-cache --upstream-db \"${ZERO_UPSTREAM_DB}\" --replica-file \"${ZERO_REPLICA_FILE}\" --schema-path /app/schema.cjs --auth-secret \"${ZERO_AUTH_SECRET}\" --admin-password \"${ZERO_ADMIN_PASSWORD}\" --log-level debug"]
