# Use official Zero Docker image
FROM rocicorp/zero:latest

# Copy schema file and entrypoint script
COPY schema.cjs /app/schema.cjs
COPY entrypoint.sh /app/entrypoint.sh

# Set working directory
WORKDIR /app

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Install @rocicorp/zero so zero-deploy-permissions can load the schema
RUN npm install @rocicorp/zero

# Zero runs on port 4848
EXPOSE 4848

# Run entrypoint script
CMD ["/app/entrypoint.sh"]
