FROM node:26-alpine3.23
WORKDIR /
copy package*.json ./
RUN npm install
COPY . /
CMD ["npm","run","dev"]