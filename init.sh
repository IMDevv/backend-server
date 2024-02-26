#!/bin/bash

# Install Docker
#apt-get update
#apt-get install -y docker.io

# Start the Docker daemon
#service docker start

# Wait for the Docker daemon to start (optional, depending on your use case)
#sleep 5

# Get the IP address of the redis-master container
#REDIS_MASTER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis-master)
#echo $REDIS_MASTER_IP

# Replace placeholder with the actual IP address in sentinel.conf
#sed -i "s/redis-master/$REDIS_MASTER_IP/g" /etc/redis/sentinel.conf

# Set appropriate permissions
#chmod -R 0777 /etc/redis/

# Run the application
bun run authService/authHandler/src/index.ts
