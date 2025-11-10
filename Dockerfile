# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file
COPY schema.js /app/schema.js

# Set working directory
WORKDIR /app

# Zero runs on port 4848
EXPOSE 4848

# Command with reduced logging to avoid Railway rate limits
CMD ["zero-cache", "--schema-path", "/app/schema.js", "--log-level", "warn"]
