FROM node:20-alpine

RUN apk add --no-cache \
  ffmpeg \
  imagemagick \
  libwebp

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps && \
    npm cache clean --force

COPY . .

EXPOSE 5000
ENV PHONE_NUMBER=967782114485
CMD ["node", "index.js"]