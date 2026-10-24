package com.securepm.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordServiceTest {

    private final PasswordService passwordService = new PasswordService();

    @Test
    void hashAndVerifyRoundtrip() {
        String hash = passwordService.hash("SecurePassword123!");
        assertNotNull(hash);
        assertTrue(passwordService.verify("SecurePassword123!", hash));
    }

    @Test
    void wrongPasswordReturnsFalse() {
        String hash = passwordService.hash("SecurePassword123!");
        assertFalse(passwordService.verify("WrongPassword123!", hash));
    }

    @Test
    void nullInputsReturnFalse() {
        String hash = passwordService.hash("SecurePassword123!");
        assertFalse(passwordService.verify(null, hash));
        assertFalse(passwordService.verify("SecurePassword123!", null));
        assertFalse(passwordService.verify(null, null));
    }

    @Test
    void samePasswordProducesDifferentHashes() {
        String hash1 = passwordService.hash("SecurePassword123!");
        String hash2 = passwordService.hash("SecurePassword123!");
        assertNotEquals(hash1, hash2);
        assertTrue(passwordService.verify("SecurePassword123!", hash1));
        assertTrue(passwordService.verify("SecurePassword123!", hash2));
    }

    @Test
    void emptyPasswordWorks() {
        String hash = passwordService.hash("");
        assertTrue(passwordService.verify("", hash));
    }
}
