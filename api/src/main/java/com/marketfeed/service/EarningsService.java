package com.marketfeed.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfeed.model.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${market-feed.alpha-vantage.api-key:demo}")
    private String apiKey;

    private static final String BASE = "https://www.alphavantage.co/query";

    // Nasdaq earnings calendar — per-day, no auth required
    private static final String NASDAQ_EARNINGS_URL =
        "https://api.nasdaq.com/api/calendar/earnings?date=%s";

    // ─── Earnings history (per symbol) ───────────────────────────────────────────

    @Cacheable(value = "earnings", key = "#symbol.toUpperCase()", unless = "#result.error != null")
    public EarningsHistory getEarningsHistory(String symbol) {
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

        // Next 14 calendar days — wide enough to always have data
        LocalDate today  = LocalDate.now(ZoneId.of("America/New_York"));
        LocalDate cutoff = today.plusDays(14);

        List<EarningsCalendarItem> upcoming = calendar.stream()
            .filter(item -> {
                try {
                    LocalDate d = LocalDate.parse(item.getReportDate());
                    return !d.isBefore(today) && !d.isAfter(cutoff);
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
        ExecutorService exec = Executors.newCachedThreadPool();
        List<CompletableFuture<EarningsSetup>> futures = upcoming.stream()
            .map(item -> CompletableFuture.supplyAsync(() -> buildSetupFast(item), exec))
            .toList();

        List<EarningsSetup> setups = futures.stream()
            .map(f -> { try { return f.get(12, TimeUnit.SECONDS); } catch (Exception e) { return null; } })
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(EarningsSetup::getReportDate)
                .thenComparingLong(s -> -(s.getMarketCap())))
            .collect(Collectors.toList());

        exec.shutdown();
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
            // 1. Current quote
            ApiResponse<Quote> qr = quoteService.getQuote(symbol);
            Quote quote = qr.getData();
            double price     = quote != null ? quote.getPrice()         : 0;
            double changePct = quote != null ? quote.getChangePercent() : 0;
            long   mktCap    = item.getMarketCap() != null ? item.getMarketCap()
                             : (quote != null ? quote.getMarketCap() : 0L);

            // 2. Options-implied expected move (no API key required — Yahoo Finance)
            Double expectedMove = price > 0 ? calcExpectedMove(symbol, item.getReportDate(), price) : null;
            Double atmIv        = price > 0 ? calcAtmIv(symbol, item.getReportDate(), price) : null;

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
                // history intentionally empty — loaded lazily
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
        for (int offset = 0; offset <= 21 && tradingDaysFetched < 14; offset++) {
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
        if (t.contains("before") || t.contains("bmo")) return "Pre-Market";
        if (t.contains("after")  || t.contains("amc")) return "After-Hours";
        return time;
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
}
