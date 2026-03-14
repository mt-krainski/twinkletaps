# Stage 1: Build the auth extension
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY hivemq-auth-extension/ .
RUN ./gradlew deployExtension --no-daemon

# Stage 2: HiveMQ CE with baked-in extension
FROM hivemq/hivemq-ce:2024.9
COPY --from=builder /build/build/deploy/twinkletaps-auth-extension \
     /opt/hivemq/extensions/twinkletaps-auth-extension
