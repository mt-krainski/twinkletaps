package com.twinkletaps.auth;

import com.hivemq.extension.sdk.api.ExtensionMain;
import com.hivemq.extension.sdk.api.parameter.ExtensionStartInput;
import com.hivemq.extension.sdk.api.parameter.ExtensionStartOutput;
import com.hivemq.extension.sdk.api.parameter.ExtensionStopInput;
import com.hivemq.extension.sdk.api.parameter.ExtensionStopOutput;
import com.hivemq.extension.sdk.api.services.Services;

import java.net.http.HttpClient;
import java.time.Duration;

public class TwinkletapsAuthExtensionMain implements ExtensionMain {

    @Override
    public void extensionStart(ExtensionStartInput input, ExtensionStartOutput output) {
        String authUrl = System.getenv("TWINKLETAPS_AUTH_URL");
        String authSecret = System.getenv("TWINKLETAPS_AUTH_SECRET");

        if (authUrl == null || authUrl.isBlank()) {
            output.preventExtensionStartup("TWINKLETAPS_AUTH_URL environment variable is not set");
            return;
        }
        if (authSecret == null || authSecret.isBlank()) {
            output.preventExtensionStartup("TWINKLETAPS_AUTH_SECRET environment variable is not set");
            return;
        }

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        TwinkletapsAuthenticator authenticator = new TwinkletapsAuthenticator(authUrl, authSecret, httpClient);

        Services.securityRegistry().setAuthenticatorProvider(
                providerInput -> authenticator
        );
    }

    @Override
    public void extensionStop(ExtensionStopInput input, ExtensionStopOutput output) {
        // No cleanup needed
    }
}
