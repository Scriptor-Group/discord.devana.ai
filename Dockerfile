#
# Development
#
FROM node:20-alpine as dev
# add the missing shared libraries from alpine base image
RUN apk add --no-cache libc6-compat
# Create app folder
WORKDIR /app

# Set to dev environment
ENV NODE_ENV dev

# Create non-root user for Docker
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy source code into app folder
COPY --chown=nodejs:nodejs . .

# Install dependencies
RUN yarn --frozen-lockfile

# Set Docker as a non-root user
USER nodejs

#
# Production Build
#
FROM node:20-alpine as build

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Set to production environment
ENV NODE_ENV production

# Re-create non-root user for Docker
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# In order to run `yarn build` we need access to the Nest CLI.
# Nest CLI is a dev dependency.
COPY --chown=nodejs:nodejs --from=dev /app/node_modules ./node_modules
# Copy source code
COPY --chown=nodejs:nodejs . .

# Generate the production build. The build script runs "nest build" to compile the application.
RUN yarn build

# Install only the production dependencies and clean cache to optimize image size.
RUN yarn --frozen-lockfile --production && yarn cache clean

# Set Docker as a non-root user
USER nodejs

#
# Production Server 🦄
#
FROM node:20-alpine as prod

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Set to production environment
ENV NODE_ENV production

# Re-create non-root user for Docker
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy only the necessary files
COPY --chown=nodejs:nodejs --from=build /app/dist dist
COPY --chown=nodejs:nodejs --from=build /app/node_modules node_modules

# Set Docker as non-root user
USER nodejs

CMD ["node", "dist/main.js"]