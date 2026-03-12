package com.twinkletaps.auth;

import com.hivemq.extension.sdk.api.auth.parameter.SimpleAuthInput;
import com.hivemq.extension.sdk.api.auth.parameter.SimpleAuthOutput;
import com.hivemq.extension.sdk.api.auth.parameter.TopicPermission;
import com.hivemq.extension.sdk.api.packets.auth.DefaultAuthorizationBehaviour;
import com.hivemq.extension.sdk.api.packets.auth.ModifiableDefaultPermissions;
import com.hivemq.extension.sdk.api.packets.connect.ConnackReasonCode;
import com.hivemq.extension.sdk.api.packets.connect.ConnectPacket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TwinkletapsAuthenticatorTest {

    private static final String AUTH_URL = "http://localhost:3000/api/mqtt/auth";
    private static final String AUTH_SECRET = "test-secret";

    @Mock private HttpClient httpClient;
    @Mock private SimpleAuthInput input;
    @Mock private SimpleAuthOutput output;
    @Mock private ConnectPacket connectPacket;
    @Mock private ModifiableDefaultPermissions defaultPermissions;
    @Mock private HttpResponse<String> httpResponse;
    @Mock private TopicPermission topicPermission;

    private TwinkletapsAuthenticator authenticator;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        authenticator = spy(new TwinkletapsAuthenticator(AUTH_URL, AUTH_SECRET, httpClient));
        doReturn(topicPermission).when(authenticator).createTopicPermission(anyString());

        when(input.getConnectPacket()).thenReturn(connectPacket);
        when(output.getDefaultPermissions()).thenReturn(defaultPermissions);
    }

    @Test
    void successfulAuthentication() throws Exception {
        when(connectPacket.getUserName()).thenReturn(Optional.of("device-1"));
        when(connectPacket.getPassword()).thenReturn(
                Optional.of(ByteBuffer.wrap("pass123".getBytes(StandardCharsets.UTF_8))));

        doReturn(httpResponse).when(httpClient).send(any(), any());
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(
                "{\"authenticated\":true,\"allowedTopics\":[\"devices/device-1/color\"]}");

        authenticator.onConnect(input, output);

        verify(output).authenticateSuccessfully();
        verify(defaultPermissions).setDefaultBehaviour(DefaultAuthorizationBehaviour.DENY);
        verify(authenticator).createTopicPermission("devices/device-1/color");
        verify(defaultPermissions).add(topicPermission);
    }

    @Test
    void failedAuthentication() throws Exception {
        when(connectPacket.getUserName()).thenReturn(Optional.of("device-1"));
        when(connectPacket.getPassword()).thenReturn(
                Optional.of(ByteBuffer.wrap("wrong".getBytes(StandardCharsets.UTF_8))));

        doReturn(httpResponse).when(httpClient).send(any(), any());
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn("{\"authenticated\":false}");

        authenticator.onConnect(input, output);

        verify(output).failAuthentication(ConnackReasonCode.NOT_AUTHORIZED, "Authentication failed");
        verify(output, never()).authenticateSuccessfully();
    }

    @Test
    void missingUsername() {
        when(connectPacket.getUserName()).thenReturn(Optional.empty());
        when(connectPacket.getPassword()).thenReturn(
                Optional.of(ByteBuffer.wrap("pass".getBytes(StandardCharsets.UTF_8))));

        authenticator.onConnect(input, output);

        verify(output).failAuthentication(ConnackReasonCode.NOT_AUTHORIZED, "Missing credentials");
    }

    @Test
    void missingPassword() {
        when(connectPacket.getUserName()).thenReturn(Optional.of("device-1"));
        when(connectPacket.getPassword()).thenReturn(Optional.empty());

        authenticator.onConnect(input, output);

        verify(output).failAuthentication(ConnackReasonCode.NOT_AUTHORIZED, "Missing credentials");
    }

    @Test
    void httpError() throws Exception {
        when(connectPacket.getUserName()).thenReturn(Optional.of("device-1"));
        when(connectPacket.getPassword()).thenReturn(
                Optional.of(ByteBuffer.wrap("pass".getBytes(StandardCharsets.UTF_8))));

        doReturn(httpResponse).when(httpClient).send(any(), any());
        when(httpResponse.statusCode()).thenReturn(500);

        authenticator.onConnect(input, output);

        verify(output).failAuthentication(ConnackReasonCode.NOT_AUTHORIZED,
                "Auth endpoint returned status 500");
    }

    @Test
    void httpTimeout() throws Exception {
        when(connectPacket.getUserName()).thenReturn(Optional.of("device-1"));
        when(connectPacket.getPassword()).thenReturn(
                Optional.of(ByteBuffer.wrap("pass".getBytes(StandardCharsets.UTF_8))));

        doThrow(new HttpTimeoutException("request timed out")).when(httpClient).send(any(), any());

        authenticator.onConnect(input, output);

        verify(output).failAuthentication(eq(ConnackReasonCode.SERVER_UNAVAILABLE),
                contains("request timed out"));
    }
}
