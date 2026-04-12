FROM node:24

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g nodemon

COPY . .

ENV DEBUG=backend:*
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "run", "init-and-watch"]
