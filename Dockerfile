FROM node:16 

WORKDIR /app
COPY . .

RUN rm -rf .env

RUN yarn install
RUN yarn run start:setup


RUN yarn run build

EXPOSE 3000
CMD ["yarn", "start"]