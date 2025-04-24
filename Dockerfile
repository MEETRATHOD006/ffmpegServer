# Use a base image with Node.js and FFmpeg
FROM node:18-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port Render will use
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
