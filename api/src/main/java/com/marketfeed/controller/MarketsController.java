package com.marketfeed.controller;

import com.marketfeed.model.ApiResponse;
import com.marketfeed.model.Quote;
import com.marketfeed.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.Objects;

@RestController
@RequestMapping("/v1/markets")
@RequiredArgsConstructor
@Tag(name = "Markets", description = "Multi-market overview strip")
public class MarketsController {

    private final QuoteService quoteService;

    // ── Ordered symbol list ────────────────────────────────────────────────────
    private static final List<String> OVERVIEW_SYMBOLS = List.of(
        // US indices
        "^GSPC", "^IXIC", "^DJI", "^RUT", "^MID", "^VIX", "^TNX", "^SOX",
        // European indices
        "^GDAXI", "^FTSE", "^FCHI", "^STOXX50E", "^AEX", "^IBEX", "^SSMI",
        // Asia-Pacific indices
        "^N225", "^HSI", "000001.SS", "^KS11", "^AXJO", "^STI", "^BSESN",
        // Latin America / Other
        "^BVSP", "^MXX",
        // US sector ETFs (as sector proxies)
        "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLC", "XLB", "XLU", "XLRE",
        // Mega-cap equities
        "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "BRK-B",
        "JPM", "V", "UNH", "XOM", "JNJ", "WMT", "MA", "PG", "ORCL", "NFLX",
        // Crypto
        "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD",
        "ADA-USD", "AVAX-USD", "LINK-USD", "DOT-USD",
        // Commodities
        "GC=F", "SI=F", "CL=F", "BZ=F", "NG=F", "HG=F"
    );

    // ── Human-readable labels ──────────────────────────────────────────────────
    private static final Map<String, String> LABELS;
    static {
        LABELS = new LinkedHashMap<>();
        // US indices
        LABELS.put("^GSPC",     "S&P 500");
        LABELS.put("^IXIC",     "Nasdaq");
        LABELS.put("^DJI",      "Dow Jones");
        LABELS.put("^RUT",      "Russell 2K");
        LABELS.put("^MID",      "S&P MidCap");
        LABELS.put("^VIX",      "VIX");
        LABELS.put("^TNX",      "10Y Yield");
        LABELS.put("^SOX",      "Philly Semi");
        // European
        LABELS.put("^GDAXI",    "DAX (Germany)");
        LABELS.put("^FTSE",     "FTSE 100 (UK)");
        LABELS.put("^FCHI",     "CAC 40 (France)");
        LABELS.put("^STOXX50E", "Euro Stoxx 50");
        LABELS.put("^AEX",      "AEX (Netherlands)");
        LABELS.put("^IBEX",     "IBEX 35 (Spain)");
        LABELS.put("^SSMI",     "SMI (Switzerland)");
        // Asia-Pacific
        LABELS.put("^N225",     "Nikkei 225");
        LABELS.put("^HSI",      "Hang Seng");
        LABELS.put("000001.SS", "Shanghai Comp.");
        LABELS.put("^KS11",     "KOSPI (Korea)");
        LABELS.put("^AXJO",     "ASX 200 (Australia)");
        LABELS.put("^STI",      "STI (Singapore)");
        LABELS.put("^BSESN",    "Sensex (India)");
        // LatAm / other
        LABELS.put("^BVSP",     "Bovespa (Brazil)");
        LABELS.put("^MXX",      "IPC (Mexico)");
        // Sector ETFs
        LABELS.put("XLK",  "Tech");
        LABELS.put("XLF",  "Financials");
        LABELS.put("XLE",  "Energy");
        LABELS.put("XLV",  "Health Care");
        LABELS.put("XLY",  "Consumer Disc.");
        LABELS.put("XLI",  "Industrials");
        LABELS.put("XLC",  "Comm. Services");
        LABELS.put("XLB",  "Materials");
        LABELS.put("XLU",  "Utilities");
        LABELS.put("XLRE", "Real Estate");
        // Equities
        LABELS.put("AAPL",  "Apple");
        LABELS.put("MSFT",  "Microsoft");
        LABELS.put("NVDA",  "NVIDIA");
        LABELS.put("AMZN",  "Amazon");
        LABELS.put("META",  "Meta");
        LABELS.put("GOOGL", "Alphabet");
        LABELS.put("TSLA",  "Tesla");
        LABELS.put("BRK-B", "Berkshire");
        LABELS.put("JPM",   "JPMorgan");
        LABELS.put("V",     "Visa");
        LABELS.put("UNH",   "UnitedHealth");
        LABELS.put("XOM",   "ExxonMobil");
        LABELS.put("JNJ",   "J&J");
        LABELS.put("WMT",   "Walmart");
        LABELS.put("MA",    "Mastercard");
        LABELS.put("PG",    "P&G");
        LABELS.put("ORCL",  "Oracle");
        LABELS.put("NFLX",  "Netflix");
        // Crypto
        LABELS.put("BTC-USD",  "Bitcoin");
        LABELS.put("ETH-USD",  "Ethereum");
        LABELS.put("SOL-USD",  "Solana");
        LABELS.put("BNB-USD",  "BNB");
        LABELS.put("XRP-USD",  "XRP");
        LABELS.put("DOGE-USD", "Dogecoin");
        LABELS.put("ADA-USD",  "Cardano");
        LABELS.put("AVAX-USD", "Avalanche");
        LABELS.put("LINK-USD", "Chainlink");
        LABELS.put("DOT-USD",  "Polkadot");
        // Commodities
        LABELS.put("GC=F", "Gold");
        LABELS.put("SI=F", "Silver");
        LABELS.put("CL=F", "Oil (WTI)");
        LABELS.put("BZ=F", "Brent");
        LABELS.put("NG=F", "Nat Gas");
        LABELS.put("HG=F", "Copper");
    }

    // ── Category groupings ─────────────────────────────────────────────────────
    private static final Map<String, String> CATEGORIES;
    static {
        CATEGORIES = new LinkedHashMap<>();
        for (String s : List.of("^GSPC","^IXIC","^DJI","^RUT","^MID","^VIX","^TNX","^SOX",
                                "^GDAXI","^FTSE","^FCHI","^STOXX50E","^AEX","^IBEX","^SSMI",
                                "^N225","^HSI","000001.SS","^KS11","^AXJO","^STI","^BSESN",
                                "^BVSP","^MXX"))                          CATEGORIES.put(s, "indices");
        for (String s : List.of("XLK","XLF","XLE","XLV","XLY","XLI","XLC","XLB","XLU","XLRE"))
                                                                          CATEGORIES.put(s, "sectors");
        for (String s : List.of("AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","BRK-B",
                                "JPM","V","UNH","XOM","JNJ","WMT","MA","PG","ORCL","NFLX"))
                                                                          CATEGORIES.put(s, "equities");
        for (String s : List.of("BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD","DOGE-USD",
                                "ADA-USD","AVAX-USD","LINK-USD","DOT-USD"))
                                                                          CATEGORIES.put(s, "crypto");
        for (String s : List.of("GC=F","SI=F","CL=F","BZ=F","NG=F","HG=F"))
                                                                          CATEGORIES.put(s, "commodities");
    }

    @GetMapping("/overview")
    @Operation(summary = "Full global market overview",
               description = "Returns quotes grouped by: global indices, sector ETFs, mega-cap equities, crypto, commodities. Cached 60s.")
    @Cacheable("markets")
    public ApiResponse<List<Map<String, Object>>> getOverview() {
        ExecutorService exec = Executors.newCachedThreadPool();

        List<CompletableFuture<Map<String, Object>>> futures = OVERVIEW_SYMBOLS.stream()
            .map(symbol -> CompletableFuture.supplyAsync(() -> {
                try {
                    ApiResponse<Quote> r = quoteService.getQuote(symbol);
                    if (r.getData() == null) return null;
                    Quote q = r.getData();
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("symbol",        symbol);
                    item.put("label",         LABELS.getOrDefault(symbol, symbol));
                    item.put("category",      CATEGORIES.getOrDefault(symbol, "equities"));
                    item.put("price",         q.getPrice());
                    item.put("change",        q.getChange());
                    item.put("changePercent", q.getChangePercent());
                    item.put("currency",      q.getCurrency());
                    return item;
                } catch (Exception e) {
                    return null;
                }
            }, exec))
            .toList();

        // Preserve ordering — collect in OVERVIEW_SYMBOLS order, skip nulls
        List<Map<String, Object>> results = futures.stream()
            .map(f -> {
                try { return f.get(8, TimeUnit.SECONDS); }
                catch (Exception e) { return null; }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        exec.shutdown();

        return ApiResponse.<List<Map<String, Object>>>builder()
                .data(results)
                .source("aggregated")
                .fetchedAt(Instant.now())
                .build();
    }
}
