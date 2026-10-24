package com.securepm.auth;

import jakarta.enterprise.context.ApplicationScoped;
import org.mindrot.jbcrypt.BCrypt;

@ApplicationScoped
public class PasswordService {

    private static final int BCRYPT_ROUNDS = 12;

    public String hash(String plaintext) {
        return BCrypt.hashpw(plaintext, BCrypt.gensalt(BCRYPT_ROUNDS));
    }

    public boolean verify(String plaintext, String hash) {
        if (plaintext == null || hash == null) {
            return false;
        }
        return BCrypt.checkpw(plaintext, hash);
    }
}
