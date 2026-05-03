FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Cloud Run expects the app to listen on port 8080 by default
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
