# Stage 1: Build
FROM eclipse-temurin:22-jdk AS builder

WORKDIR /app

COPY . .

# Make the wrapper executable
RUN chmod +x gradlew

# Build using the project's Gradle Wrapper
RUN ./gradlew buildFatJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:22-jre

WORKDIR /app

RUN mkdir -p /app/data /app/downloads

COPY --from=builder /app/build/libs/app.jar app.jar

ENV DATA_DIR=/app/data
ENV DOWNLOADS_DIR=/app/downloads

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]