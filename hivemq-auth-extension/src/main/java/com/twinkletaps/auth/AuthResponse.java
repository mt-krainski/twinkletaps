package com.twinkletaps.auth;

import java.util.List;

/** Response from the twinkletaps backend auth endpoint. */
class AuthResponse {
    boolean authenticated;
    List<String> allowedTopics;
}
