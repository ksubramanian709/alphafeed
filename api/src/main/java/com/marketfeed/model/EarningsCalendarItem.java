package com.marketfeed.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EarningsCalendarItem {
    private String symbol;
    private String name;
    private String reportDate;
    private String fiscalDateEnding;
    private Double estimate;
    private Double lastYearEPS;
    private String currency;
    private Long   marketCap;
    private String reportTime;   // "Before Market Open", "After Market Close", etc.
    private Integer analystCount;
}
