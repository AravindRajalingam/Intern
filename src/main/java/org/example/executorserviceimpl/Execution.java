package org.example.executorserviceimpl;

import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class Execution {
//    ExecutorService executorService= Executors.newFixedThreadPool(2);
//    ExecutorService executorService1=Executors.newFixedThreadPool(2);
//    ExecutorService executorService= Executors.newCachedThreadPool();
//    ExecutorService executorService= Executors.newSingleThreadExecutor();
   ScheduledExecutorService executorService= Executors.newScheduledThreadPool(2);
    public void execution(){
        for(int i=0;i<6;i++) {
            int taskNum = i;
//            executorService.submit(()->{
//                System.out.println(taskNum+" "+Thread.currentThread().getName());
//                try {
//                    Thread.sleep(1000);
//                } catch (InterruptedException e) {
//                    throw new RuntimeException(e);
//                }
//            });
//
//            executorService1.submit(()->{
//                System.out.println(taskNum+" "+Thread.currentThread().getName());
//                try {
//                    Thread.sleep(1000);
//                } catch (InterruptedException e) {
//                    throw new RuntimeException(e);
//                }
//            });

            executorService.schedule(()->{
                System.out.println(taskNum+" "+Thread.currentThread().getName());
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            },4,TimeUnit.SECONDS);
        }
//        executorService.shutdown();
//        executorService1.shutdown();
    }
}
