FROM maven:3.10-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /work
COPY --from=build /build/target/*-runner.jar /work/application.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/work/application.jar"]
