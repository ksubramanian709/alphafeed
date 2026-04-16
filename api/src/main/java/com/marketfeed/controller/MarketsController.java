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

@RestController
@RequestMapping("/v1/markets")
@RequiredArgsConstructor
@Tag(name = "Markets", description = "Multi-market overview strip")
public class MarketsController {

    private final QuoteService quoteService;

    // Indices → mega-caps → crypto → commodities
    private static final List<String> OVERVIEW_SYMBOLS = List.of(
        // Indices
        "^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "^TNX",
        // Mega-cap equities
        "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "BRK-B", "JPM", "V",
        // Crypto
        "BTC-USD", "ETH-USD", "SOL-USD",
        // Commodities
        "GC=F", "CL=F", "NG=F", "SI=F"
    );

    private static final Map<String, String> LABELS = Map.ofEntries(
        Map.entry("^GSPC",   "S&P 500"),
        Map.entry("^IXIC",   "Nasdaq"),
        Map.entry("^DJI",    "Dow"),
        Map.entry("^RUT",    "Russell 2K"),
        Map.entry("^VIX",    "VIX"),
        Map.entry("^TNX",    "10Y Yield"),
        Map.entry("AAPL",    "Apple"),
        Map.entry("MSFT",    "Microsoft"),
        Map.entry("NVDA",    "NVIDIA"),
        Map.entry("AMZN",    "Amazon"),
        Map.entry("META",    "Meta"),
        Map.entry("GOOGL",   "Alphabet"),
        Map.entry("TSLA",    "Tesla"),
        Map.entry("BRK-B",   "Berkshire"),
        Map.entry("JPM",     "JPMorgan"),
        Map.entry("V",       "Visa"),
        Map.entry("BTC-USD", "Bitcoin"),
        Map.entry("ETH-USD", "Ethereum"),
        Map.entry("SOL-USD", "Solana"),
        Map.entry("GC=F",    "Gold"),
        Map.entry("CL=F",    "Oil (WTI)"),
        Map.entry("NG=F",    "Nat Gas"),
        Map.entry("SI=F",    "Silver")
    );

    // Category groupings for the market pulse view
    private static final Map<String, String> CATEGORIES = Map.ofEntries(
        Map.entry("^GSPC",   "indices"),
        Map.entry("^IXIC",   "indices"),
        Map.entry("^DJI",    "indices"),
        Map.entry("^RUT",    "indices"),
        Map.entry("^VIX",    "indices"),
        Map.entry("^TNX",    "indices"),
        Map.entry("AAPL",    "equities"),
        Map.entry("MSFT",    "equities"),
        Map.entry("NVDA",    "equities"),
        Map.entry("AMZN",    "equities"),
        Map.entry("META",    "equities"),
        Map.entry("GOOGL",   "equities"),
        Map.entry("TSLA",    "equities"),
        Map.entry("BRK-B",   "equities"),
        Map.entry("JPM",     "equities"),
        Map.entry("V",       "equities"),
        Map.entry("BTC-USD", "crypto"),
        Map.entry("ETH-USD", "crypto"),
        Map.entry("SOL-USD", "crypto"),
        Map.entry("GC=F",    "commodities"),
        Map.entry("CL=F",    "commodities"),
        Map.entry("NG=F",    "commodities"),
        Map.entry("SI=F",    "commodities")
    );

    @GetMapping("/overview")
    @Operation(summary = "Multi-market overview strip",
               description = "Returns quotes for S&P 500, Nasdaq, Dow, Russell 2000, VIX, 10Y Yield, Bitcoin, Ethereum, Gold, and Oil. Cached 60s.")
    @Cacheable("markets")
    public ApiResponse<List<Map<String, Object>>> getOverview() {
        List<Map<String, Object>> results = new ArrayList<>();

        for (String symbol : OVERVIEW_SYMBOLS) {
            try {
                ApiResponse<Quote> r = quoteService.getQuote(symbol);
                if (r.getData() == null) continue;
                Quote q = r.getData();

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("symbol",        symbol);
                item.put("label",         LABELS.getOrDefault(symbol, symbol));
                item.put("category",      CATEGORIES.getOrDefault(symbol, "equities"));
                item.put("price",         q.getPrice());
                item.put("change",        q.getChange());
                item.put("changePercent", q.getChangePercent());
                item.put("currency",      q.getCurrency());
                results.add(item);
            } catch (Exception e) {
                // Skip failed symbols — overview should never crash
            }
        }

        return ApiResponse.<List<Map<String, Object>>>builder()
                .data(results)
                .source("aggregated")
                .fetchedAt(Instant.now())
                .build();
    }
}
