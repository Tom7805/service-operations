# Dockerfile cho Railway (service backend đặt Root Directory = /backend).
#
# Railway chỉ tải về các tệp nằm trong Root Directory, nên không thấy docker/backend/Dockerfile; tệp này
# nằm ngay trong backend/ để Railway tự nhận. Nội dung GIỐNG HỆT docker/backend/Dockerfile (Render,
# docker-compose vẫn dùng tệp đó) — sửa một bên thì sửa cả hai.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Railway/Render cấp cổng qua biến PORT lúc chạy; ${PORT:-8080} vẫn chạy đúng khi không có PORT.
# Tùy chỉnh JVM (vd bộ nhớ) bằng biến JAVA_TOOL_OPTIONS trên nền tảng, không cần sửa tệp này.
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-${SERVER_PORT:-8080}} -jar app.jar"]
