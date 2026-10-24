package com.securepm;

import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.annotations.QuarkusMain;

@QuarkusMain
public class SecurePMApplication {
    public static void main(String[] args) {
        Quarkus.run(args);
    }
}
