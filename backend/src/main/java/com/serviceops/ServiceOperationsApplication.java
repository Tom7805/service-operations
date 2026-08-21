package com.serviceops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ServiceOperationsApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServiceOperationsApplication.class, args);
    }
}
