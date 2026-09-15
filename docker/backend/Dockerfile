# Build context: ./backend (xem docker-compose.yml / Render "Root Directory")
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render/nhiều PaaS cấp cổng qua biến PORT lúc chạy; ${PORT:-8080} vẫn cho
# chạy đúng khi không có PORT (vd docker-compose local dùng SERVER_PORT).
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-${SERVER_PORT:-8080}} -jar app.jar"]
