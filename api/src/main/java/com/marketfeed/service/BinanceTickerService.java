package com.marketfeed.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfeed.model.QuoteUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Connects to Binance public WebSocket stream for real-time crypto ticks.
 * No API key required. Publishes QuoteUpdatedEvent for each tick.
 *
 * Data flow:
 *   Binance WS → BinanceTickerService → ApplicationEventPublisher → QuoteStreamHandler → browser
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BinanceTickerService {

    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${market-feed.binance.enabled:true}")
    private boolean enabled;

    @Value("${market-feed.binance.symbols:btcusdt,ethusdt,solusdt,xrpusdt,bnbusdt,dogeusdt,adausdt,avaxusdt,linkusdt,maticusdt}")
    private String symbolsConfig;

    private static final String BINANCE_WS_BASE = "wss://stream.binance.com:9443/stream?streams=";

    private volatile WebSocket webSocket;
    private volatile boolean shutdown = false;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(
            r -> { Thread t = new Thread(r, "binance-reconnect"); t.setDaemon(true); return t; });

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!enabled) {
            log.info("[Binance] WebSocket feed disabled via config");
            return;
        }
        connect(0);
    }

    private void connect(long delaySeconds) {
        if (shutdown) return;
        if (delaySeconds > 0) {
            log.info("[Binance] Reconnecting in {}s...", delaySeconds);
        }
        scheduler.schedule(this::doConnect, delaySeconds, TimeUnit.SECONDS);
    }

    private void doConnect() {
        if (shutdown) return;
        try {
            List<String> symbols = Arrays.stream(symbolsConfig.split(","))
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());

            String streams = symbols.stream()
                    .map(s -> s + "@ticker")
                    .collect(Collectors.joining("/"));

            String url = BINANCE_WS_BASE + streams;
            log.info("[Binance] Connecting to {} symbols: {}", symbols.size(), symbols);

            HttpClient client = HttpClient.newHttpClient();
            client.newWebSocketBuilder()
                    .buildAsync(URI.create(url), new BinanceListener())
                    .whenComplete((ws, ex) -> {
                        if (ex != null) {
                            log.warn("[Binance] Connection failed: {}", ex.getMessage());
                            scheduleReconnect();
                        } else {
                            this.webSocket = ws;
                            log.info("[Binance] Connected — streaming real-time ticks");
                        }
                    });
        } catch (Exception e) {
            log.warn("[Binance] doConnect error: {}", e.getMessage());
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        if (!shutdown) connect(10);
    }

    @PreDestroy
    public void shutdown() {
        shutdown = true;
        scheduler.shutdownNow();
        if (webSocket != null) {
            webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "shutdown");
        }
    }

    private class BinanceListener implements WebSocket.Listener {

        private final StringBuilder buffer = new StringBuilder();

        @Override
        public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            buffer.append(data);
            if (last) {
                String message = buffer.toString();
                buffer.setLength(0);
                handleMessage(message);
            }
            ws.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket ws, int statusCode, String reason) {
            log.warn("[Binance] Connection closed: {} {}", statusCode, reason);
            scheduleReconnect();
            return null;
        }

        @Override
        public void onError(WebSocket ws, Throwable error) {
            log.warn("[Binance] Error: {}", error.getMessage());
            scheduleReconnect();
        }

        private void handleMessage(String raw) {
            try {
                JsonNode root = objectMapper.readTree(raw);
                // Combined stream format: { "stream": "btcusdt@ticker", "data": { ... } }
                JsonNode data = root.has("data") ? root.get("data") : root;

                String binanceSymbol = data.path("s").asText(); // e.g. "BTCUSDT"
                if (binanceSymbol.isEmpty()) return;

                String symbol = normalizeBinanceSymbol(binanceSymbol); // "BTC-USD"
                double price         = data.path("c").asDouble(); // last price
                double open          = data.path("o").asDouble();
                double high          = data.path("h").asDouble();
                double low           = data.path("l").asDouble();
                double volume        = data.path("v").asDouble();
                double change        = price - open;
                double changePercent = data.path("P").asDouble(); // 24h change %

                if (price <= 0) return;

                eventPublisher.publishEvent(new QuoteUpdatedEvent(
                        symbol, price, change, changePercent,
                        high, low, volume, "binance", Instant.now()
                ));

                log.debug("[Binance] {} ${} ({:+.2f}%)", symbol, price, changePercent);

            } catch (Exception e) {
                log.debug("[Binance] Failed to parse message: {}", e.getMessage());
            }
        }

        private String normalizeBinanceSymbol(String binanceSymbol) {
            // BTCUSDT → BTC-USD, ETHUSDT → ETH-USD, etc.
            if (binanceSymbol.endsWith("USDT")) {
                return binanceSymbol.substring(0, binanceSymbol.length() - 4) + "-USD";
            }
            if (binanceSymbol.endsWith("USD")) {
                return binanceSymbol.substring(0, binanceSymbol.length() - 3) + "-USD";
            }
            return binanceSymbol;
        }
    }
}
