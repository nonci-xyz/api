FROM node:16 

WORKDIR /app
COPY . .

RUN yarn install
RUN yarn run build

RUN rm -rf /app/.env

EXPOSE 3000
CMD ["yarn", "start"]