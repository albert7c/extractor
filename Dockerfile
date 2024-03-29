FROM node:10

ARG VERSION=0.1.2

RUN curl -L -o extractor.zip https://github.com/deps-cloud/des/archive/v${VERSION}.zip && \
    unzip extractor.zip && \
    mv extractor-${VERSION} /app

WORKDIR /app

RUN npm install && npm run build

ENTRYPOINT [ "npm", "start", "--" ]
