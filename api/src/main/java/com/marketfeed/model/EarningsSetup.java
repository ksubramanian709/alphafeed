package com.marketfeed.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class EarningsSetup {

    private String symbol;
    private String name;
    private String reportDate;       // "2024-04-17"
    private String reportTime;       // "Pre-Market" | "After-Hours" | null

    // EPS context
    private Double  epsEstimate;     // analyst consensus
    private Double  lastYearEps;
    private Integer analystCount;

    // Current market snapshot
    private double  currentPrice;
    private double  changePercent;
    private long    marketCap;

    // Options-derived expected move
    private Double  expectedMovePercent;   // null if options unavailable
    private Double  atmIv;                 // ATM implied volatility (0.30 = 30%)

    // Historical earnings record (last 4 quarters, newest first)
    private List<QuarterlyEarning> history;
    private Integer beatCount;         // beats out of last 4
    private Double  avgSurprisePct;    // average surprise % last 4

    private String error;

    // True when reportDate <= today (report has already occurred or is today)
    private boolean alreadyReported;

    // Populated from Yahoo Finance immediately after earnings are released
    private Double reportedEps;       // actual EPS reported
    private Double epsSurprise;       // reported - estimated
    private Double epsSurprisePct;    // (reported - estimated) / |estimated| * 100
}
