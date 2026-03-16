package com.twinkletaps.auth;

import com.google.gson.Gson;
import com.hivemq.extension.sdk.api.auth.SimpleAuthenticator;
import com.hivemq.extension.sdk.api.auth.parameter.SimpleAuthInput;
import com.hivemq.extension.sdk.api.auth.parameter.SimpleAuthOutput;
import com.hivemq.extension.sdk.api.packets.connect.ConnackReasonCode;
import com.hivemq.extension.sdk.api.packets.connect.ConnectPacket;
import com.hivemq.extension.sdk.api.packets.auth.DefaultAuthorizationBehaviour;
import com.hivemq.extension.sdk.api.packets.auth.ModifiableDefaultPermissions;
import com.hivemq.extension.sdk.api.auth.parameter.TopicPermission;
import com.hivemq.extension.sdk.api.services.builder.Builders;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

public class TwinkletapsAuthenticator implements SimpleAuthenticator {

    private static final Logger LOG = Logger.getLogger(TwinkletapsAuthenticator.class.getName());

    private final String authUrl;
    private final String authSecret;
    private final HttpClient httpClient;
    private final Gson gson = new Gson();

    public TwinkletapsAuthenticator(String authUrl, String authSecret, HttpClient httpClient) {
        this.authUrl = authUrl;
        this.authSecret = authSecret;
        this.httpClient = httpClient;
    }

    @Override
    public void onConnect(SimpleAuthInput input, SimpleAuthOutput output) {
        ConnectPacket connectPacket = input.getConnectPacket();

        Optional<String> usernameOpt = connectPacket.getUserName();
        Optional<ByteBuffer> passwordOpt = connectPacket.getPassword();

        if (usernameOpt.isEmpty() || passwordOpt.isEmpty()) {
            output.failAuthentication(ConnackReasonCode.NOT_AUTHORIZED, "Missing credentials");
            return;
        }

        String username = usernameOpt.get();
        ByteBuffer passwordBuffer = passwordOpt.get().duplicate();
        byte[] passwordBytes = new byte[passwordBuffer.remaining()];
        passwordBuffer.get(passwordBytes);
        String password = new String(passwordBytes, StandardCharsets.UTF_8);

        try {
            String requestBody = gson.toJson(new CredentialsRequest(username, password));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(authUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + authSecret)
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                output.failAuthentication(ConnackReasonCode.NOT_AUTHORIZED,
                        "Auth endpoint returned status " + response.statusCode());
                return;
            }

            AuthResponse authResponse = gson.fromJson(response.body(), AuthResponse.class);

            if (authResponse.authenticated && authResponse.allowedTopics != null) {
                output.authenticateSuccessfully();
                ModifiableDefaultPermissions permissions = output.getDefaultPermissions();
                permissions.setDefaultBehaviour(DefaultAuthorizationBehaviour.DENY);

                for (String topic : authResponse.allowedTopics) {
                    permissions.add(createTopicPermission(topic));
                }
            } else {
                output.failAuthentication(ConnackReasonCode.NOT_AUTHORIZED, "Authentication failed");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Auth service error for user '" + username + "' calling " + authUrl, e);
            output.failAuthentication(ConnackReasonCode.SERVER_UNAVAILABLE,
                    "Auth service error: " + e.getMessage());
        }
    }

    TopicPermission createTopicPermission(String topic) {
        return Builders.topicPermission()
                .topicFilter(topic)
                .build();
    }

    private static class CredentialsRequest {
        final String username;
        final String password;

        CredentialsRequest(String username, String password) {
            this.username = username;
            this.password = password;
        }
    }
}
