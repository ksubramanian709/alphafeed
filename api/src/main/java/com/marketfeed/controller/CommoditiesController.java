package com.marketfeed.controller;

import com.marketfeed.model.ApiResponse;
import com.marketfeed.model.Quote;
import com.marketfeed.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/commodities")
@RequiredArgsConstructor
@Tag(name = "Commodities", description = "Complete CME/CBOT/NYMEX/COMEX/ICE futures universe")
public class CommoditiesController {

    private final QuoteService quoteService;

    @Autowired
    @Qualifier("taskExecutor")
    private ExecutorService taskExecutor;

    // Full CME Group + ICE futures — verified Yahoo Finance symbols
    private static final Map<String, List<String>> FUTURES;
    static {
        FUTURES = new LinkedHashMap<>();

        // ── NYMEX Energy ──────────────────────────────────────────────────────
        FUTURES.put("energy", List.of(
            "CL=F",   // WTI Crude Oil
            "BZ=F",   // Brent Crude Oil
            "NG=F",   // Henry Hub Natural Gas
            "RB=F",   // RBOB Gasoline
            "HO=F"    // NY Harbor Heating Oil (Diesel)
        ));

        // ── COMEX Metals ──────────────────────────────────────────────────────
        FUTURES.put("metals", List.of(
            "GC=F",   // Gold
            "SI=F",   // Silver
            "HG=F",   // Copper (High Grade)
            "PL=F",   // Platinum
            "PA=F"    // Palladium
        ));

        // ── CBOT Grains & Oilseeds ────────────────────────────────────────────
        FUTURES.put("grains", List.of(
            "ZC=F",   // Corn
            "ZW=F",   // Chicago SRW Wheat
            "KE=F",   // KC HRW Wheat
            "ZS=F",   // Soybeans
            "ZM=F",   // Soybean Meal
            "ZL=F",   // Soybean Oil
            "ZO=F",   // Oats
            "ZR=F"    // Rough Rice
        ));

        // ── ICE Softs ────────────────────────────────────────────────────────
        FUTURES.put("softs", List.of(
            "KC=F",   // Arabica Coffee (ICE)
            "SB=F",   // Raw Sugar #11 (ICE)
            "CC=F",   // Cocoa (ICE)
            "CT=F",   // Cotton #2 (ICE)
            "OJ=F",   // FCOJ-A Orange Juice (ICE)
            "LBS=F"   // Random Length Lumber (CME)
        ));

        // ── CME Livestock ─────────────────────────────────────────────────────
        FUTURES.put("livestock", List.of(
            "LE=F",   // Live Cattle
            "GF=F",   // Feeder Cattle
            "HE=F"    // Lean Hogs
        ));

        // ── CME Equity Index Futures ──────────────────────────────────────────
        FUTURES.put("index_futures", List.of(
            "ES=F",   // E-mini S&P 500
            "NQ=F",   // E-mini Nasdaq-100
            "YM=F",   // E-mini Dow Jones
            "RTY=F",  // E-mini Russell 2000
            "MES=F",  // Micro E-mini S&P 500
            "MNQ=F",  // Micro E-mini Nasdaq-100
            "MYM=F",  // Micro E-mini Dow
            "M2K=F"   // Micro E-mini Russell 2000
        ));

        // ── CBOT Interest Rate Futures ────────────────────────────────────────
        FUTURES.put("rates", List.of(
            "ZB=F",   // 30Y US Treasury Bond
            "ZN=F",   // 10Y US Treasury Note
            "ZF=F",   // 5Y US Treasury Note
            "ZT=F",   // 2Y US Treasury Note
            "ZQ=F"    // 30-Day Federal Funds
        ));

        // ── CME FX Futures ────────────────────────────────────────────────────
        FUTURES.put("currencies", List.of(
            "DX=F",   // US Dollar Index (ICE)
            "6E=F",   // Euro FX
            "6J=F",   // Japanese Yen
            "6B=F",   // British Pound
            "6C=F",   // Canadian Dollar
            "6A=F",   // Australian Dollar
            "6S=F",   // Swiss Franc
            "6N=F",   // New Zealand Dollar
            "6M=F",   // Mexican Peso
            "6L=F",   // Brazilian Real
            "6Z=F",   // South African Rand
            "6I=F"    // Indian Rupee
        ));
    }

    @GetMapping("/futures")
    @Operation(summary = "Complete futures snapshot — CME/CBOT/NYMEX/COMEX/ICE",
               description = "Energy, metals, grains, softs, livestock, index futures, rates, FX. Cached 2 min.")
    @Cacheable("commodities")
    public ApiResponse<Map<String, List<Quote>>> getFuturesSnapshot() {
        // Kick off all fetches in parallel across all sectors
        Map<String, List<CompletableFuture<Quote>>> sectorFutures = new LinkedHashMap<>();
        FUTURES.forEach((sector, symbols) -> {
            List<CompletableFuture<Quote>> futs = symbols.stream()
                .map(sym -> CompletableFuture.supplyAsync(() -> {
                    try {
                        ApiResponse<Quote> r = quoteService.getQuote(sym);
                        return r.getData();
                    } catch (Exception e) {
                        return null;
                    }
                }, taskExecutor))
                .collect(Collectors.toList());
            sectorFutures.put(sector, futs);
        });

        // Collect results preserving sector order
        Map<String, List<Quote>> snapshot = new LinkedHashMap<>();
        sectorFutures.forEach((sector, futs) -> {
            List<Quote> quotes = futs.stream()
                .map(f -> {
                    try { return f.get(8, TimeUnit.SECONDS); }
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
            if (!quotes.isEmpty()) snapshot.put(sector, quotes);
        });

        return ApiResponse.<Map<String, List<Quote>>>builder()
                .data(snapshot)
                .source("cme_group")
                .fetchedAt(Instant.now())
                .build();
    }
}
