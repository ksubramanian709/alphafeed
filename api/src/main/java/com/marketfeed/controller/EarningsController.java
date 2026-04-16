package com.marketfeed.controller;

import com.marketfeed.model.EarningsCalendarItem;
import com.marketfeed.model.EarningsHistory;
import com.marketfeed.model.EarningsSetup;
import com.marketfeed.service.EarningsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/earnings")
@RequiredArgsConstructor
@Tag(name = "Earnings", description = "Earnings history and upcoming calendar")
public class EarningsController {

    private final EarningsService earningsService;

    @GetMapping("/calendar")
    @Operation(summary = "Upcoming earnings reports", description = "Returns companies reporting earnings in the next 30 days, sorted by date.")
    public ResponseEntity<List<EarningsCalendarItem>> calendar() {
        return ResponseEntity.ok(earningsService.getEarningsCalendar());
    }

    @GetMapping("/week")
    @Operation(summary = "Earnings decision engine — top setups this week",
               description = "Top 25 largest-cap companies reporting in the next 7 days with expected move, beat history, and EPS context. Cached 30 min.")
    public ResponseEntity<List<EarningsSetup>> week() {
        return ResponseEntity.ok(earningsService.getWeeklySetups());
    }

    @GetMapping("/{symbol}")
    @Operation(summary = "Earnings history for a symbol", description = "Returns last 8 quarters of EPS: reported vs estimated, surprise amount and percent.")
    public ResponseEntity<EarningsHistory> history(@PathVariable String symbol) {
        EarningsHistory result = earningsService.getEarningsHistory(symbol);
        if (result.getError() != null && result.getQuarterlyEarnings() == null) {
            return ResponseEntity.status(503).body(result);
        }
        return ResponseEntity.ok(result);
    }
}
