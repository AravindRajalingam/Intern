package org.example.executorserviceimpl.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class AsyncService {

    @Async
    public CompletableFuture<String> asyncMethod() throws InterruptedException {
        Thread.sleep(1000);
        System.out.println("Async method");
        return CompletableFuture.completedFuture("Async Method");
    }
}
