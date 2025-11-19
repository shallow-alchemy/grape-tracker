# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file
COPY schema.cjs /app/schema.cjs

# Set working directory
WORKDIR /app

# Zero runs on port 4848
EXPOSE 4848

# Start zero-cache - it will auto-detect env vars
CMD ["zero-cache", "--schema-path", "/app/schema.cjs"]
