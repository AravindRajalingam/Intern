package org.example.executorserviceimpl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ExecutorServiceImplApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExecutorServiceImplApplication.class, args);
//        Execution execution=new Execution();
//        execution.execution();
    }

}
