FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile
COPY init.sh .
RUN chmod +x init.sh


# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy dev dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=prerelease /usr/src/app/authService/authHandler ./authService/authHandler
COPY --from=prerelease /usr/src/app/package.json .
# RUN chown -R bun:bun /usr/src/app/authService/authHandler/logs/Auth
# RUN chmod -R 755 /usr/src/app/authService/authHandler/logs/Auth
#COPY configSentinel /etc/redis/

#RUN chmod -R 0777 /etc/redis/

# run the app
USER root
EXPOSE 4000/tcp
ENTRYPOINT [ "./init.sh" ]
