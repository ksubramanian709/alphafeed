package com.marketfeed.controller;

import com.marketfeed.model.ApiResponse;
import com.marketfeed.model.Quote;
import com.marketfeed.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;


@RestController
@RequestMapping("/v1/commodities")
@RequiredArgsConstructor
@Tag(name = "Commodities", description = "Futures snapshots for energy, metals, and grains")
public class CommoditiesController {

    private final QuoteService quoteService;

    // Full commodity universe across six verticals
    private static final Map<String, List<String>> FUTURES = new LinkedHashMap<>(Map.of(
        "energy",    List.of("CL=F", "BZ=F", "NG=F", "RB=F", "HO=F"),          // Crude, Brent, NatGas, Gasoline, Heating Oil
        "metals",    List.of("GC=F", "SI=F", "HG=F", "PL=F", "PA=F"),          // Gold, Silver, Copper, Platinum, Palladium
        "grains",    List.of("ZC=F", "ZW=F", "ZS=F", "ZO=F", "ZR=F"),          // Corn, Wheat, Soybeans, Oats, Rice
        "softs",     List.of("KC=F", "SB=F", "CC=F", "CT=F", "OJ=F"),          // Coffee, Sugar, Cocoa, Cotton, OJ
        "livestock", List.of("LE=F", "HE=F", "GF=F"),                           // Live Cattle, Lean Hogs, Feeder Cattle
        "financials",List.of("ES=F", "NQ=F", "YM=F", "RTY=F", "ZN=F", "ZB=F") // E-mini S&P/Nasdaq/Dow/Russell, 10Y/30Y
    ));

    @GetMapping("/futures")
    @Operation(summary = "Snapshot of all key commodity futures",
               description = "Returns latest quotes for energy, metals, and grains futures. Cached 2 min.")
    @Cacheable("commodities")
    public ApiResponse<Map<String, List<Quote>>> getFuturesSnapshot() {
        Map<String, List<Quote>> snapshot = new LinkedHashMap<>();

        FUTURES.forEach((sector, symbols) -> {
            List<Quote> quotes = symbols.stream()
                    .map(sym -> quoteService.getQuote(sym))
                    .filter(r -> r.getData() != null)
                    .map(ApiResponse::getData)
                    .toList();
            snapshot.put(sector, quotes);
        });

        return ApiResponse.<Map<String, List<Quote>>>builder()
                .data(snapshot)
                .source("aggregated")
                .fetchedAt(Instant.now())
                .build();
    }

}
