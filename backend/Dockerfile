FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g nodemon

COPY . .

ENV DEBUG=backend:*
ENV PORT=5000

EXPOSE 5000

CMD ["node", "./scripts/create_default_user.js", "&&", "npm", "run", "watch"]
