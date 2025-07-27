package com.krushna.smallchat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmallChatApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmallChatApplication.class, args);
    }

}
