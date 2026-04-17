package com.marketfeed.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfeed.model.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.*;
import java.time.DayOfWeek;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EarningsService {

    private final RestTemplate restTemplate;
    private final ScreenerService screenerService;
    private final QuoteService quoteService;
    private final OptionsService optionsService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    @Qualifier("taskExecutor")
    private ExecutorService taskExecutor;

    @Value("${market-feed.alpha-vantage.api-key:demo}")
    private String apiKey;

    private static final String BASE = "https://www.alphavantage.co/query";

    // Nasdaq earnings calendar — per-day, no auth required
    private static final String NASDAQ_EARNINGS_URL =
        "https://api.nasdaq.com/api/calendar/earnings?date=%s";

    // ─── Earnings history (per symbol) ───────────────────────────────────────────
    // Yahoo Finance is tried first (instant, no rate limit). Alpha Vantage is fallback for deeper history.

    @Cacheable(value = "earnings", key = "#symbol.toUpperCase()", unless = "#result.error != null")
    public EarningsHistory getEarningsHistory(String symbol) {
        // 1. Try Yahoo Finance first — real-time, no API key, updates as soon as earnings drop
        EarningsHistory yahooResult = getEarningsFromYahoo(symbol);
        if (yahooResult.getError() == null
                && yahooResult.getQuarterlyEarnings() != null
                && yahooResult.getQuarterlyEarnings().size() >= 2) {
            log.info("Earnings history for {} from Yahoo Finance ({} quarters)",
                     symbol, yahooResult.getQuarterlyEarnings().size());
            return yahooResult;
        }

        // 2. Fall back to Alpha Vantage for deeper history
        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE)
                    .queryParam("function", "EARNINGS")
                    .queryParam("symbol", symbol.toUpperCase())
                    .queryParam("apikey", apiKey)
                    .toUriString();

            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);
            if (resp.getBody() == null) {
                return EarningsHistory.builder().symbol(symbol).error("No data returned").build();
            }

            Map<?, ?> body = resp.getBody();

            if (body.containsKey("Information") || body.containsKey("Note")) {
                Object msgObj = body.containsKey("Information") ? body.get("Information") : body.get("Note");
                String msg = msgObj != null ? msgObj.toString() : "rate limit";
                log.warn("Alpha Vantage earnings limit for {}: {}", symbol, msg);
                // Return Yahoo partial data rather than error when AV is rate-limited
                if (yahooResult.getQuarterlyEarnings() != null && !yahooResult.getQuarterlyEarnings().isEmpty()) {
                    return yahooResult;
                }
                return EarningsHistory.builder().symbol(symbol).error("API rate limit reached").build();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, String>> raw = (List<Map<String, String>>) body.get("quarterlyEarnings");
            if (raw == null || raw.isEmpty()) {
                return EarningsHistory.builder().symbol(symbol).error("No earnings data available").build();
            }

            List<QuarterlyEarning> quarters = new ArrayList<>();
            for (Map<String, String> q : raw) {
                quarters.add(QuarterlyEarning.builder()
                        .fiscalDateEnding(q.get("fiscalDateEnding"))
                        .reportedDate(q.get("reportedDate"))
                        .reportedEps(parseDouble(q.get("reportedEPS")))
                        .estimatedEps(parseDouble(q.get("estimatedEPS")))
                        .surprise(parseDouble(q.get("surprise")))
                        .surprisePercentage(parseDouble(q.get("surprisePercentage")))
                        .build());
                if (quarters.size() >= 8) break;
            }

            return EarningsHistory.builder().symbol(symbol).quarterlyEarnings(quarters).build();

        } catch (Exception e) {
            log.error("Failed to fetch earnings history for {}: {}", symbol, e.getMessage());
            return EarningsHistory.builder().symbol(symbol).error(e.getMessage()).build();
        }
    }

    /**
     * Fetch earnings history from Yahoo Finance quoteSummary.
     * Fetches earnings + income statement quarterly in one call — no API key, updates immediately.
     */
    public EarningsHistory getEarningsFromYahoo(String symbol) {
        try {
            String url = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/"
                       + symbol.toUpperCase()
                       + "?modules=earnings%2CincomeStatementHistoryQuarterly";
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible)");
            headers.set(HttpHeaders.ACCEPT, "application/json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<YahooEarningsResp> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, YahooEarningsResp.class);

            if (resp.getBody() == null || resp.getBody().getQuoteSummary() == null) {
                return EarningsHistory.builder().symbol(symbol).error("No Yahoo data").build();
            }
            List<YahooEarningsResult> results = resp.getBody().getQuoteSummary().getResult();
            if (results == null || results.isEmpty()) {
                return EarningsHistory.builder().symbol(symbol).error("No Yahoo results").build();
            }
            YahooEarningsResult result0 = results.get(0);
            YahooEarningsModule earningsMod = result0.getEarnings();
            if (earningsMod == null || earningsMod.getEarningsChart() == null) {
                return EarningsHistory.builder().symbol(symbol).error("No earnings chart").build();
            }
            List<YahooQuarterlyEarning> quarters = earningsMod.getEarningsChart().getQuarterly();
            if (quarters == null || quarters.isEmpty()) {
                return EarningsHistory.builder().symbol(symbol).error("No quarterly data").build();
            }

            // Build revenue map: ISO date -> revenue in dollars (from income statement)
            Map<String, Long> revenueByDate = new HashMap<>();
            Map<String, Long> revEstByDate  = new HashMap<>();
            if (result0.getIncomeStatementHistoryQuarterly() != null
                    && result0.getIncomeStatementHistoryQuarterly().getIncomeStatementHistory() != null) {
                for (YahooIncomeStmtEntry entry : result0.getIncomeStatementHistoryQuarterly().getIncomeStatementHistory()) {
                    if (entry.getEndDate() != null && entry.getTotalRevenue() != null) {
                        revenueByDate.put(entry.getEndDate().getFmt(),
                                          Math.round(entry.getTotalRevenue().getRaw()));
                    }
                }
            }

            // Yahoo returns most recent first; convert quarter label to ISO date
            List<QuarterlyEarning> out = new ArrayList<>();
            for (YahooQuarterlyEarning q : quarters) {
                Double reported  = q.getActual()   != null ? q.getActual().getRaw()   : null;
                Double estimated = q.getEstimate()  != null ? q.getEstimate().getRaw() : null;
                Double surprise  = (reported != null && estimated != null) ? reported - estimated : null;
                Double surprisePct = (surprise != null && estimated != null && estimated != 0)
                                   ? (surprise / Math.abs(estimated)) * 100 : null;
                String isoDate   = yahooQuarterToDate(q.getDate());

                out.add(QuarterlyEarning.builder()
                        .fiscalDateEnding(isoDate)
                        .reportedDate(null)
                        .reportedEps(reported)
                        .estimatedEps(estimated)
                        .surprise(surprise)
                        .surprisePercentage(surprisePct)
                        .reportedRevenue(revenueByDate.get(isoDate))
                        .estimatedRevenue(revEstByDate.get(isoDate))
                        .build());
            }

            return EarningsHistory.builder().symbol(symbol).quarterlyEarnings(out).build();

        } catch (Exception e) {
            log.debug("Yahoo earnings fetch failed for {}: {}", symbol, e.getMessage());
            return EarningsHistory.builder().symbol(symbol).error(e.getMessage()).build();
        }
    }

    /**
     * Fetch the forward revenue estimate for the current quarter from Yahoo earningsTrend.
     * Returns null if unavailable.
     */
    private Long fetchForwardRevenueEstimate(String symbol) {
        try {
            String url = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/"
                       + symbol.toUpperCase() + "?modules=earningsTrend";
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible)");
            headers.set(HttpHeaders.ACCEPT, "application/json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<YahooEarningsResp> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, YahooEarningsResp.class);
            if (resp.getBody() == null || resp.getBody().getQuoteSummary() == null) return null;
            List<YahooEarningsResult> results = resp.getBody().getQuoteSummary().getResult();
            if (results == null || results.isEmpty()) return null;
            YahooEarningsTrendWrapper trendWrapper = results.get(0).getEarningsTrend();
            if (trendWrapper == null || trendWrapper.getTrend() == null) return null;

            return trendWrapper.getTrend().stream()
                    .filter(t -> "0q".equals(t.getPeriod()))
                    .findFirst()
                    .map(t -> t.getRevenueEstimate() != null && t.getRevenueEstimate().getAvg() != null
                            ? Math.round(t.getRevenueEstimate().getAvg().getRaw()) : null)
                    .orElse(null);
        } catch (Exception e) {
            log.debug("Revenue estimate fetch failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    /** Convert Yahoo quarter label "1Q2025" → "2025-03-31" */
    private String yahooQuarterToDate(String label) {
        if (label == null || label.length() < 6) return label;
        try {
            int q    = Integer.parseInt(label.substring(0, 1));
            int year = Integer.parseInt(label.substring(2));
            String[] endMonths = { "03-31", "06-30", "09-30", "12-31" };
            return year + "-" + endMonths[Math.min(q - 1, 3)];
        } catch (Exception e) {
            return label;
        }
    }

    /** Fetch the most recently reported quarter's EPS from Yahoo Finance.
     *  Returns [reportedEps, surprise, surprisePct] or null if unavailable. */
    private double[] fetchLatestReportedEps(String symbol) {
        try {
            EarningsHistory h = getEarningsFromYahoo(symbol);
            if (h.getError() != null || h.getQuarterlyEarnings() == null || h.getQuarterlyEarnings().isEmpty()) {
                return null;
            }
            QuarterlyEarning latest = h.getQuarterlyEarnings().get(0);
            if (latest.getReportedEps() == null) return null;
            double reported    = latest.getReportedEps();
            double surprise    = latest.getSurprise()    != null ? latest.getSurprise()    : 0;
            double surprisePct = latest.getSurprisePercentage() != null ? latest.getSurprisePercentage() : 0;
            return new double[]{ reported, surprise, surprisePct };
        } catch (Exception e) {
            return null;
        }
    }

    // ─── Earnings calendar ────────────────────────────────────────────────────────

    @Cacheable(value = "earnings-calendar", key = "'upcoming'", unless = "#result == null || #result.isEmpty()")
    public List<EarningsCalendarItem> getEarningsCalendar() {
        // Primary: Nasdaq earnings calendar (no auth, reliable)
        List<EarningsCalendarItem> items = fetchNasdaqEarningsCalendar();
        if (items.isEmpty()) {
            log.info("Nasdaq earnings calendar empty — falling back to Alpha Vantage");
            items = fetchAlphaVantageCalendar();
        } else {
            log.info("Earnings calendar loaded from Nasdaq: {} companies", items.size());
        }

        // Build market cap lookup from screener universe (already cached)
        Map<String, Long> capBySymbol = new HashMap<>();
        try {
            screenerService.getUniverse().forEach(f -> {
                if (f.getMarketCap() != null) capBySymbol.put(f.getSymbol(), f.getMarketCap());
            });
        } catch (Exception e) {
            log.warn("Could not enrich earnings calendar with market caps: {}", e.getMessage());
        }

        // Enrich items that are missing a market cap, sort by cap desc, keep top 500, re-sort by date
        return items.stream()
            .map(item -> {
                Long cap = item.getMarketCap() != null ? item.getMarketCap()
                         : capBySymbol.get(item.getSymbol());
                return EarningsCalendarItem.builder()
                    .symbol(item.getSymbol())
                    .name(item.getName())
                    .reportDate(item.getReportDate())
                    .fiscalDateEnding(item.getFiscalDateEnding())
                    .estimate(item.getEstimate())
                    .lastYearEPS(item.getLastYearEPS())
                    .currency(item.getCurrency())
                    .marketCap(cap)
                    .reportTime(item.getReportTime())
                    .analystCount(item.getAnalystCount())
                    .build();
            })
            .sorted(Comparator.comparingLong(
                (EarningsCalendarItem i) -> i.getMarketCap() != null ? i.getMarketCap() : 0L
            ).reversed())
            .limit(500)
            .sorted(Comparator.comparing(EarningsCalendarItem::getReportDate))
            .collect(Collectors.toList());
    }

    // ─── Weekly earnings setups ───────────────────────────────────────────────────

    @Cacheable(value = "earnings-setups", key = "'week'")
    public List<EarningsSetup> getWeeklySetups() {
        List<EarningsCalendarItem> calendar = getEarningsCalendar();

        // Past 7 days + next 14 days — show what already happened this week AND what's coming
        LocalDate today  = LocalDate.now(ZoneId.of("America/New_York"));
        LocalDate since  = today.minusDays(7);
        LocalDate cutoff = today.plusDays(14);

        List<EarningsCalendarItem> upcoming = calendar.stream()
            .filter(item -> {
                try {
                    LocalDate d = LocalDate.parse(item.getReportDate());
                    return !d.isBefore(since) && !d.isAfter(cutoff);
                } catch (Exception e) { return false; }
            })
            .sorted(Comparator.comparingLong(
                (EarningsCalendarItem i) -> i.getMarketCap() != null ? i.getMarketCap() : 0L
            ).reversed())
            .limit(30)
            .collect(Collectors.toList());

        if (upcoming.isEmpty()) {
            log.info("No upcoming earnings in next 14 days; calendar has {} total items", calendar.size());
            return List.of();
        }

        log.info("Building setups for {} upcoming earnings", upcoming.size());

        // Parallel fetch: quote + options only (history is lazy-loaded per card)
        List<CompletableFuture<EarningsSetup>> futures = upcoming.stream()
            .map(item -> CompletableFuture.supplyAsync(() -> buildSetupFast(item), taskExecutor))
            .toList();

        List<EarningsSetup> setups = futures.stream()
            .map(f -> { try { return f.get(12, TimeUnit.SECONDS); } catch (Exception e) { return null; } })
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(EarningsSetup::getReportDate)
                .thenComparingLong(s -> -(s.getMarketCap())))
            .collect(Collectors.toList());
        log.info("Weekly setups built: {} of {}", setups.size(), upcoming.size());
        return setups;
    }

    /**
     * Fast per-symbol setup: calendar data + live quote + options expected move.
     * Earnings history is NOT fetched here — the frontend loads it lazily via /v1/earnings/{symbol}.
     * This avoids blasting Alpha Vantage rate limits on 25 parallel calls.
     */
    private EarningsSetup buildSetupFast(EarningsCalendarItem item) {
        String symbol = item.getSymbol();
        try {
            LocalDate today       = LocalDate.now(ZoneId.of("America/New_York"));
            LocalDate reportDate  = LocalDate.parse(item.getReportDate());
            // Considered reported if the date has passed, or it's today and pre-market
            boolean alreadyReported = reportDate.isBefore(today)
                || (reportDate.equals(today) && "Pre-Market".equals(item.getReportTime()));

            // 1. Current quote
            ApiResponse<Quote> qr = quoteService.getQuote(symbol);
            Quote quote = qr.getData();
            double price     = quote != null ? quote.getPrice()         : 0;
            double changePct = quote != null ? quote.getChangePercent() : 0;
            long   mktCap    = item.getMarketCap() != null ? item.getMarketCap()
                             : (quote != null ? quote.getMarketCap() : 0L);

            // 2. For already-reported companies: fetch actual EPS from Yahoo Finance immediately
            Double reportedEps    = null;
            Double epsSurprise    = null;
            Double epsSurprisePct = null;
            if (alreadyReported) {
                double[] actual = fetchLatestReportedEps(symbol);
                if (actual != null) {
                    reportedEps    = actual[0];
                    epsSurprise    = actual[1];
                    epsSurprisePct = actual[2];
                }
            }

            // 3. Options-implied expected move — try MarketData.app first, fall back to Yahoo Finance
            Double expectedMove = null;
            Double atmIv        = null;
            if (price > 0 && !alreadyReported) {
                // Only calculate expected move for upcoming earnings (past earnings don't need it)
                expectedMove = calcExpectedMove(symbol, item.getReportDate(), price);
                atmIv        = calcAtmIv(symbol, item.getReportDate(), price);
                if (expectedMove == null) {
                    double[] yahooMove = calcExpectedMoveFromYahoo(symbol, item.getReportDate(), price);
                    if (yahooMove != null) {
                        expectedMove = yahooMove[0];
                        atmIv        = yahooMove[1];
                    }
                }
            }

            return EarningsSetup.builder()
                .symbol(symbol)
                .name(item.getName())
                .reportDate(item.getReportDate())
                .reportTime(item.getReportTime())
                .epsEstimate(item.getEstimate())
                .lastYearEps(item.getLastYearEPS())
                .analystCount(item.getAnalystCount())
                .currentPrice(price)
                .changePercent(changePct)
                .marketCap(mktCap)
                .expectedMovePercent(expectedMove)
                .atmIv(atmIv)
                .alreadyReported(alreadyReported)
                .reportedEps(reportedEps)
                .epsSurprise(epsSurprise)
                .epsSurprisePct(epsSurprisePct)
                .history(List.of())
                .beatCount(null)
                .avgSurprisePct(null)
                .build();

        } catch (Exception e) {
            log.warn("buildSetupFast failed for {}: {}", symbol, e.getMessage());
            return EarningsSetup.builder()
                .symbol(symbol)
                .name(item.getName())
                .reportDate(item.getReportDate())
                .reportTime(item.getReportTime())
                .marketCap(item.getMarketCap() != null ? item.getMarketCap() : 0L)
                .history(List.of())
                .build();
        }
    }

    private Double calcExpectedMove(String symbol, String earningsDate, double stockPrice) {
        try {
            Long targetExp = findNearestExpAfterEarnings(symbol, earningsDate);
            ApiResponse<OptionsChain> resp = optionsService.getOptionsChain(symbol, targetExp);
            if (resp.getData() == null) return null;

            OptionsChain chain = resp.getData();
            OptionsContract atmCall = findAtm(chain.getCalls(), stockPrice);
            OptionsContract atmPut  = findAtm(chain.getPuts(),  stockPrice);
            if (atmCall == null || atmPut == null) return null;

            double callPrice = atmCall.getBid() > 0.01 ? atmCall.getBid() : atmCall.getLastPrice();
            double putPrice  = atmPut.getBid()  > 0.01 ? atmPut.getBid()  : atmPut.getLastPrice();
            if (callPrice <= 0 || putPrice <= 0) return null;

            return Math.round(((callPrice + putPrice) / stockPrice * 100.0) * 10.0) / 10.0;
        } catch (Exception e) {
            return null;
        }
    }

    private Double calcAtmIv(String symbol, String earningsDate, double stockPrice) {
        try {
            Long targetExp = findNearestExpAfterEarnings(symbol, earningsDate);
            ApiResponse<OptionsChain> resp = optionsService.getOptionsChain(symbol, targetExp);
            if (resp.getData() == null) return null;

            OptionsChain chain = resp.getData();
            OptionsContract atmCall = findAtm(chain.getCalls(), stockPrice);
            return atmCall != null ? atmCall.getImpliedVolatility() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Long findNearestExpAfterEarnings(String symbol, String earningsDate) {
        try {
            LocalDate ed = LocalDate.parse(earningsDate);
            long earningsEpoch = ed.atStartOfDay(ZoneOffset.UTC).toEpochSecond();

            // Get the base chain to read available expirations
            ApiResponse<OptionsChain> base = optionsService.getOptionsChain(symbol, null);
            if (base.getData() == null || base.getData().getAllExpirationDates() == null) return null;

            return base.getData().getAllExpirationDates().stream()
                .filter(e -> e >= earningsEpoch)
                .min(Long::compareTo)
                .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private OptionsContract findAtm(List<OptionsContract> contracts, double price) {
        if (contracts == null || contracts.isEmpty()) return null;
        return contracts.stream()
            .min(Comparator.comparingDouble(c -> Math.abs(c.getStrike() - price)))
            .orElse(null);
    }

    // ─── Nasdaq earnings calendar — iterates 14 weekdays ─────────────────────────

    private List<EarningsCalendarItem> fetchNasdaqEarningsCalendar() {
        List<EarningsCalendarItem> items = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneId.of("America/New_York"));

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT,
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        headers.set(HttpHeaders.ACCEPT, "application/json, text/plain, */*");
        headers.set("Referer", "https://www.nasdaq.com/");
        headers.set("Origin", "https://www.nasdaq.com");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        int tradingDaysFetched = 0;
        // Start 10 calendar days back to capture the past week's reporters
        for (int offset = -10; offset <= 21 && tradingDaysFetched < 21; offset++) {
            LocalDate date = today.plusDays(offset);
            DayOfWeek dow = date.getDayOfWeek();
            if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) continue;
            tradingDaysFetched++;

            try {
                String url = String.format(NASDAQ_EARNINGS_URL, date.toString());
                ResponseEntity<NasdaqEarningsResp> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, NasdaqEarningsResp.class);

                if (resp.getBody() == null || resp.getBody().getData() == null) continue;

                List<NasdaqEarningsRow> rows = resp.getBody().getData().getRows();
                if (rows == null) continue;

                String dateStr = date.toString();
                for (NasdaqEarningsRow row : rows) {
                    if (row.getSymbol() == null || row.getSymbol().isBlank()) continue;

                    String sym = row.getSymbol().trim();
                    // Skip symbols with special chars (preferred shares, warrants, etc.)
                    if (sym.contains("/") || sym.contains("+") || sym.length() > 5) continue;

                    Double estimate  = parseDouble(row.getEpsForecast());
                    Double lastYear  = parseDouble(row.getLastYearEPS());
                    Long   cap       = parseMarketCap(row.getMarketCap());
                    Integer analysts = parseInteger(row.getNoOfEst());

                    String reportTime = normalizeReportTime(row.getTime());

                    items.add(EarningsCalendarItem.builder()
                        .symbol(sym)
                        .name(row.getName())
                        .reportDate(dateStr)
                        .fiscalDateEnding(dateStr)
                        .estimate(estimate)
                        .lastYearEPS(lastYear)
                        .currency("USD")
                        .marketCap(cap)
                        .reportTime(reportTime)
                        .analystCount(analysts)
                        .build());
                }
            } catch (Exception e) {
                log.warn("Nasdaq earnings fetch failed for {}: {}", date, e.getMessage());
            }
        }

        items.sort(Comparator.comparing(EarningsCalendarItem::getReportDate));
        log.info("Nasdaq earnings raw fetch: {} companies across {} trading days", items.size(), tradingDaysFetched);
        return items;
    }

    private String normalizeReportTime(String time) {
        if (time == null || time.isBlank() || time.equalsIgnoreCase("Time Not Supplied")) return null;
        String t = time.toLowerCase();
        if (t.contains("before") || t.contains("bmo") || t.contains("pre")) return "Pre-Market";
        if (t.contains("after")  || t.contains("amc") || t.contains("post")) return "After-Hours";
        return null; // treat unknown as no time
    }

    private Long parseMarketCap(String s) {
        if (s == null || s.isBlank() || s.equals("N/A")) return null;
        try {
            String mc = s.replace("$", "").replace(",", "").trim();
            if (mc.endsWith("T")) return (long)(Double.parseDouble(mc.replace("T","")) * 1_000_000_000_000L);
            if (mc.endsWith("B")) return (long)(Double.parseDouble(mc.replace("B","")) * 1_000_000_000L);
            if (mc.endsWith("M")) return (long)(Double.parseDouble(mc.replace("M","")) * 1_000_000L);
        } catch (Exception ignored) {}
        return null;
    }

    private Integer parseInteger(String s) {
        if (s == null || s.isBlank() || s.equals("N/A")) return null;
        try { return Integer.parseInt(s.trim()); }
        catch (NumberFormatException ignored) { return null; }
    }

    // ─── Alpha Vantage fallback ───────────────────────────────────────────────────

    private List<EarningsCalendarItem> fetchAlphaVantageCalendar() {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE)
                    .queryParam("function", "EARNINGS_CALENDAR")
                    .queryParam("horizon", "1month")
                    .queryParam("apikey", apiKey)
                    .toUriString();

            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, null, String.class);
            if (resp.getBody() == null || resp.getBody().isBlank()) return List.of();

            String[] lines = resp.getBody().trim().split("\n");
            if (lines.length < 2) return List.of();

            List<EarningsCalendarItem> items = new ArrayList<>();
            LocalDate today  = LocalDate.now();
            LocalDate cutoff = today.plusDays(30);

            for (int i = 1; i < lines.length; i++) {
                String[] cols = lines[i].split(",");
                if (cols.length < 4) continue;
                String sym        = cols[0].trim();
                String name       = cols.length > 1 ? cols[1].trim() : "";
                String reportDate = cols.length > 2 ? cols[2].trim() : "";
                String fiscal     = cols.length > 3 ? cols[3].trim() : "";
                Double estimate   = cols.length > 4 ? parseDouble(cols[4].trim()) : null;
                String currency   = cols.length > 5 ? cols[5].trim() : "USD";

                try {
                    LocalDate rd = LocalDate.parse(reportDate);
                    if (rd.isBefore(today) || rd.isAfter(cutoff)) continue;
                } catch (Exception ignored) { continue; }

                items.add(EarningsCalendarItem.builder()
                        .symbol(sym).name(name).reportDate(reportDate)
                        .fiscalDateEnding(fiscal).estimate(estimate).currency(currency)
                        .build());
            }

            items.sort(Comparator.comparing(EarningsCalendarItem::getReportDate));
            return items;

        } catch (Exception e) {
            log.error("Alpha Vantage earnings calendar failed: {}", e.getMessage());
            return List.of();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private Double parseDouble(String s) {
        if (s == null || s.isBlank() || s.equals("None") || s.equals("-") || s.equals("N/A")) return null;
        try { return Double.parseDouble(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    // ─── Yahoo Finance options expected move fallback ─────────────────────────────

    /**
     * Fetches the ATM straddle expected move from Yahoo Finance public options API.
     * No API key required. Returns [expectedMovePercent, atmIv] or null on failure.
     */
    private double[] calcExpectedMoveFromYahoo(String symbol, String earningsDate, double stockPrice) {
        try {
            LocalDate ed = LocalDate.parse(earningsDate);
            long earningsEpoch = ed.atStartOfDay(ZoneOffset.UTC).toEpochSecond();

            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible)");
            headers.set(HttpHeaders.ACCEPT, "application/json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // First call: get list of expiration dates
            String baseUrl = "https://query2.finance.yahoo.com/v7/finance/options/" + symbol.toUpperCase();
            ResponseEntity<YahooOptionsResp> baseResp = restTemplate.exchange(
                    baseUrl, HttpMethod.GET, entity, YahooOptionsResp.class);

            if (baseResp.getBody() == null || baseResp.getBody().getOptionChain() == null) return null;
            List<YahooOptionsResult> baseResults = baseResp.getBody().getOptionChain().getResult();
            if (baseResults == null || baseResults.isEmpty()) return null;

            YahooOptionsResult baseResult = baseResults.get(0);
            List<Long> expDates = baseResult.getExpirationDates();
            if (expDates == null || expDates.isEmpty()) return null;

            // Find nearest expiration on or after earnings date
            Long targetExp = expDates.stream()
                    .filter(e -> e >= earningsEpoch)
                    .min(Long::compareTo)
                    .orElse(expDates.get(0));

            // Second call: fetch the chain for that specific expiration
            String expUrl = baseUrl + "?date=" + targetExp;
            ResponseEntity<YahooOptionsResp> resp = restTemplate.exchange(
                    expUrl, HttpMethod.GET, entity, YahooOptionsResp.class);

            if (resp.getBody() == null || resp.getBody().getOptionChain() == null) return null;
            List<YahooOptionsResult> results = resp.getBody().getOptionChain().getResult();
            if (results == null || results.isEmpty()) return null;

            YahooOptionsResult result = results.get(0);
            if (result.getOptions() == null || result.getOptions().isEmpty()) return null;

            YahooOptionsData opts = result.getOptions().get(0);
            List<YahooContract> calls = opts.getCalls();
            List<YahooContract> puts  = opts.getPuts();
            if (calls == null || puts == null || calls.isEmpty() || puts.isEmpty()) return null;

            YahooContract atmCall = calls.stream()
                    .min(Comparator.comparingDouble(c -> Math.abs(c.getStrike() - stockPrice)))
                    .orElse(null);
            YahooContract atmPut = puts.stream()
                    .min(Comparator.comparingDouble(p -> Math.abs(p.getStrike() - stockPrice)))
                    .orElse(null);

            if (atmCall == null || atmPut == null) return null;

            double callPrice = atmCall.getBid() > 0.01 ? atmCall.getBid() : atmCall.getLastPrice();
            double putPrice  = atmPut.getBid()  > 0.01 ? atmPut.getBid()  : atmPut.getLastPrice();
            if (callPrice <= 0 || putPrice <= 0) return null;

            double move = Math.round(((callPrice + putPrice) / stockPrice * 100.0) * 10.0) / 10.0;
            double iv   = atmCall.getImpliedVolatility();
            return new double[]{ move, iv > 0 ? iv : 0 };

        } catch (Exception e) {
            log.debug("Yahoo options fallback failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    // ─── Nasdaq DTOs ─────────────────────────────────────────────────────────────

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class NasdaqEarningsResp {
        private NasdaqEarningsData data;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class NasdaqEarningsData {
        private List<NasdaqEarningsRow> rows;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class NasdaqEarningsRow {
        private String symbol;
        private String name;
        @JsonProperty("marketCap")   private String marketCap;
        @JsonProperty("eps_forecast") private String epsForecast;
        @JsonProperty("eps_actual")   private String epsActual;
        @JsonProperty("lastYearRptDt") private String lastYearRptDt;
        @JsonProperty("lastYearEPS")   private String lastYearEPS;
        private String time;
        @JsonProperty("noOfEst")      private String noOfEst;
    }

    // ─── Yahoo Finance Earnings DTOs ─────────────────────────────────────────────

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooEarningsResp {
        @JsonProperty("quoteSummary")
        private YahooQuoteSummaryE quoteSummary;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooQuoteSummaryE {
        private List<YahooEarningsResult> result;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooEarningsResult {
        private YahooEarningsModule earnings;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooEarningsModule {
        private YahooEarningsChart earningsChart;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooEarningsChart {
        private List<YahooQuarterlyEarning> quarterly;
        private YahooRawValue currentQuarterEstimate;
        private String currentQuarterEstimateDate;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooQuarterlyEarning {
        private String date;          // "1Q2025"
        private YahooRawValue actual;
        private YahooRawValue estimate;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooRawValue {
        private double raw;
        private String fmt;
    }

    // ─── Yahoo Finance Options DTOs ───────────────────────────────────────────────

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooOptionsResp {
        private YahooOptionChain optionChain;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooOptionChain {
        private List<YahooOptionsResult> result;
        private Object error;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooOptionsResult {
        private String       underlyingSymbol;
        private List<Long>   expirationDates;
        private List<YahooOptionsData> options;
        private YahooOptionsQuote quote;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooOptionsQuote {
        private double regularMarketPrice;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooOptionsData {
        private long expirationDate;
        private List<YahooContract> calls;
        private List<YahooContract> puts;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    static class YahooContract {
        private double strike;
        private double bid;
        private double ask;
        private double lastPrice;
        private double impliedVolatility;
        private long   volume;
        private long   openInterest;
    }
}
