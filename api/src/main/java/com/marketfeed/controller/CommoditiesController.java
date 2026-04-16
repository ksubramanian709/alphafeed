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

    // Full futures universe — every actively traded Yahoo Finance futures symbol
    private static final Map<String, List<String>> FUTURES;
    static {
        FUTURES = new LinkedHashMap<>();
        // Energy
        FUTURES.put("energy", List.of(
            "CL=F",  // WTI Crude Oil
            "BZ=F",  // Brent Crude
            "NG=F",  // Natural Gas
            "RB=F",  // RBOB Gasoline
            "HO=F",  // Heating Oil
            "QO=F"   // E-mini Crude Oil
        ));
        // Metals
        FUTURES.put("metals", List.of(
            "GC=F",  // Gold
            "SI=F",  // Silver
            "HG=F",  // Copper
            "PL=F",  // Platinum
            "PA=F",  // Palladium
            "ALI=F"  // Aluminum
        ));
        // Grains
        FUTURES.put("grains", List.of(
            "ZC=F",  // Corn
            "ZW=F",  // Chicago Wheat
            "KE=F",  // KC Hard Red Wheat
            "ZS=F",  // Soybeans
            "ZL=F",  // Soybean Oil
            "ZM=F",  // Soybean Meal
            "ZO=F",  // Oats
            "ZR=F"   // Rough Rice
        ));
        // Softs
        FUTURES.put("softs", List.of(
            "KC=F",  // Coffee
            "SB=F",  // Sugar #11
            "CC=F",  // Cocoa
            "CT=F",  // Cotton #2
            "OJ=F",  // Orange Juice
            "LBS=F"  // Lumber
        ));
        // Livestock
        FUTURES.put("livestock", List.of(
            "LE=F",  // Live Cattle
            "HE=F",  // Lean Hogs
            "GF=F"   // Feeder Cattle
        ));
        // Equity index futures
        FUTURES.put("index_futures", List.of(
            "ES=F",  // E-mini S&P 500
            "NQ=F",  // E-mini Nasdaq 100
            "YM=F",  // E-mini Dow Jones
            "RTY=F", // E-mini Russell 2000
            "EMD=F", // E-mini S&P MidCap 400
            "NKD=F"  // Nikkei 225 Dollar
        ));
        // Interest rates
        FUTURES.put("rates", List.of(
            "ZB=F",  // 30Y T-Bond
            "ZN=F",  // 10Y T-Note
            "ZF=F",  // 5Y T-Note
            "ZT=F",  // 2Y T-Note
            "ZQ=F",  // 30-Day Fed Funds
            "GE=F"   // Eurodollar
        ));
        // Currencies
        FUTURES.put("currencies", List.of(
            "6E=F",  // Euro
            "6J=F",  // Japanese Yen
            "6B=F",  // British Pound
            "6C=F",  // Canadian Dollar
            "6A=F",  // Australian Dollar
            "6S=F",  // Swiss Franc
            "6N=F",  // New Zealand Dollar
            "6M=F",  // Mexican Peso
            "DX=F"   // US Dollar Index
        ));
    }

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
