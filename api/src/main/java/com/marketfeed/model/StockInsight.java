package com.marketfeed.model;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class StockInsight {
    private String       symbol;
    private String       name;
    private String       sentiment;       // "bullish" | "bearish" | "neutral"
    private String       summary;         // 2-3 sentence overview
    private List<String> bullPoints;      // 3 bull case bullets
    private List<String> bearPoints;      // 3 bear case bullets
    private String       keyRisk;         // single biggest risk
    private String       catalyst;        // next near-term catalyst
    private String       error;
    private Instant      generatedAt;
}
