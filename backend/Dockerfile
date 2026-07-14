# Stage 1: Build the Ktor app
FROM gradle:8.14-jdk22 AS builder

WORKDIR /app
COPY . .

RUN gradle buildFatJar --no-daemon

# Stage 2: Run the app
FROM eclipse-temurin:22-jre

WORKDIR /app

RUN mkdir -p /app/data /app/downloads

COPY --from=builder /app/build/libs/*-all.jar app.jar

ENV DATA_DIR=/app/data
ENV DOWNLOADS_DIR=/app/downloads

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
