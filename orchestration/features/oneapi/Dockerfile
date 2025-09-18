FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production || npm i --production
EXPOSE 3000
CMD ["node","server.js"]
