# Base image
FROM node:21

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

#WARN walk around for the connection issue during build
#RUN npm ci --maxsockets 1

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Copy the .env and .env.development files
COPY .env ./

# Creates a "dist" folder with the production build
RUN npm run build

# # Expose the port on which the app will run
EXPOSE 3009

# Start the server using the production build
CMD ["npm", "run", "prod"]