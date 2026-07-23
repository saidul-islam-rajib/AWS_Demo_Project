# NestJS 11 and its CLI require Node >= 20; Node 18 built but logged
# EBADENGINE warnings for @nestjs/core, @nestjs/cli and others.
FROM node:20-alpine

# sharp renders the certificate from SVG, and Alpine ships no fonts, so the
# text would come out blank without these.
RUN apk add --no-cache ttf-dejavu

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Posts are written here. Mount a volume at this path or they are lost
# when the pipeline replaces the container.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/main"]
