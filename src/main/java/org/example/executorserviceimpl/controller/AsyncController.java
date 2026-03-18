package org.example.executorserviceimpl.controller;

import org.example.executorserviceimpl.service.AsyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

@RestController
public class AsyncController {

    @Autowired
    private AsyncService asyncService;

    @GetMapping("/async")
    public ResponseEntity<?> asyncMethod() throws InterruptedException {
        CompletableFuture<String> data=asyncService.asyncMethod();
        method();
        newMethod();
        return ResponseEntity.status(HttpStatus.OK).body(data);
    }

    public void method(){
        System.out.println("After async method");
    }

    public void newMethod(){
        System.out.println("New method");
        for(int i=0;i<10;i++){
            System.out.println("Loop "+i);
        }
    }
}
