package com.marketfeed.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketfeed.model.ApiResponse;
import com.marketfeed.model.NewsItem;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.*;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.stream.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private final RestTemplate restTemplate;

    @Value("${market-feed.alpha-vantage.api-key:}")
    private String alphaVantageKey;

    @Value("${market-feed.brave.api-key:}")
    private String braveApiKey;

    // ─── RSS source URLs ────────────────────────────────────────────────────────

    // Yahoo Finance RSS — company-specific (most reliable)
    private static final String YAHOO_RSS =
        "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%s&region=US&lang=en-US";

    // Google News RSS — keyword search (broad coverage, any topic)
    private static final String GOOGLE_NEWS_RSS =
        "https://news.google.com/rss/search?q=%s+stock+market&hl=en-US&gl=US&ceid=US:en";

    // Seeking Alpha RSS — equity-focused editorial
    private static final String SEEKING_ALPHA_RSS =
        "https://seekingalpha.com/api/sa/combined/%s.xml";

    // ── Finance/markets-specific feeds — verified working as of 2025 ────────────
    private static final String CNBC_MARKETS_RSS =
        "https://www.cnbc.com/id/20910258/device/rss/rss.html";
    private static final String CNBC_FINANCE_RSS =
        "https://www.cnbc.com/id/10000664/device/rss/rss.html";
    private static final String CNBC_EARNINGS_RSS =
        "https://www.cnbc.com/id/15839135/device/rss/rss.html";          // CNBC Earnings
    private static final String MARKETWATCH_RSS =
        "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/";
    private static final String MARKETWATCH_ECONOMY_RSS =
        "https://feeds.marketwatch.com/marketwatch/economy-politics/";
    private static final String AP_FINANCE_RSS =
        "https://feeds.apnews.com/rss/apf-finance";
    private static final String AP_BUSINESS_RSS =
        "https://feeds.apnews.com/rss/apf-business";
    private static final String YAHOO_FINANCE_RSS =
        "https://finance.yahoo.com/news/rssindex";                        // Yahoo Finance general
    private static final String SEEKING_ALPHA_MARKET_RSS =
        "https://seekingalpha.com/market_currents.xml";                   // SA market news
    private static final String BARRONS_RSS =
        "https://www.barrons.com/rss/public/rss.xml";
    private static final String INVESTORS_BUSINESS_RSS =
        "https://www.investors.com/feed/";                                // Investors Business Daily
    private static final String GOOGLE_BUSINESS_RSS =
        "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB"; // Google Business

    // ── Title relevance: must contain at least one of these financial keywords ──
    private static final java.util.regex.Pattern FINANCE_PATTERN =
        java.util.regex.Pattern.compile(
            "\\b(stock|market|share|equity|fund|bond|yield|rate|fed|federal reserve|" +
            "bank|economy|gdp|inflation|cpi|earnings|revenue|profit|loss|ipo|merger|" +
            "acquisition|nasdaq|nyse|s&p|dow|index|trade|tariff|oil|gold|dollar|" +
            "currency|crypto|bitcoin|sector|quarterly|fiscal|analyst|investor|" +
            "wall street|interest rate|central bank|treasury|dividend|hedge|" +
            "portfolio|asset|commodity|futures|options|rally|selloff|recession|" +
            "growth|debt|deficit|budget|spending|tax|regulation|sec|sanctions|" +
            "geopolit|war|conflict|policy|deal|billion|million|trillion|percent|" +
            "\\$|price|cost|unemployment|layoff|hire|quarter|supply chain|" +
            "chip|semiconductor|energy|crude|gas|coal|retail|consumer|spending|" +
            "housing|mortgage|real estate|reit|etf|buyback|insider|short|" +
            "vc|venture|startup|valuation|revenue|margin|guidance|outlook)\\b",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );

    // Brave News API — primary source (diverse: Reuters, Bloomberg, FT, WSJ, etc.)
    private static final String BRAVE_NEWS_URL = "https://api.search.brave.com/res/v1/news/search";

    // Alpha Vantage news (used when API key is configured)
    private static final String AV_NEWS_URL = "https://www.alphavantage.co/query";

    // ─── Public API ─────────────────────────────────────────────────────────────

    /**
     * General market news — Brave News API primary, RSS fallback. Cached 10 min.
     */
    @Cacheable(value = "news", key = "'market_headlines'")
    public ApiResponse<List<NewsItem>> getMarketNews() {
        List<NewsItem> items = new ArrayList<>();

        // Primary: Brave News API — diverse publishers (Reuters, Bloomberg, FT, WSJ, AP, CNBC…)
        items.addAll(fetchBraveNews("stock market financial news economy fed interest rates", 20));
        items.addAll(fetchBraveNews("earnings results markets today wall street", 10));

        // RSS fallback — reliable public feeds
        items.addAll(fetchRss(AP_FINANCE_RSS,    "AP Finance",   6));
        items.addAll(fetchRss(AP_BUSINESS_RSS,   "AP Business",  4));
        items.addAll(fetchRss(MARKETWATCH_RSS,   "MarketWatch",  6));
        items.addAll(fetchRss(YAHOO_FINANCE_RSS, "Yahoo Finance",6));
        items.addAll(fetchRss(CNBC_MARKETS_RSS,  "CNBC",         5));
        items.addAll(fetchRss(CNBC_FINANCE_RSS,  "CNBC",         4));

        // Alpha Vantage supplement
        if (alphaVantageKey != null && !alphaVantageKey.isBlank()) {
            items.addAll(fetchAlphaVantageNews(null, "financial_markets,economy_macro", 10));
        }

        Instant cutoff24h = Instant.now().minus(24, java.time.temporal.ChronoUnit.HOURS);
        List<NewsItem> result = deduplicate(items).stream()
                .filter(item -> isFinanciallyRelevant(item.getTitle()))
                .filter(item -> item.getPublishedAt() == null || item.getPublishedAt().isAfter(cutoff24h))
                .sorted(Comparator.comparing(NewsItem::getPublishedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(40)
                .collect(Collectors.toList());

        return result.isEmpty()
            ? ApiResponse.error("No news available")
            : ApiResponse.success(result, "news_aggregated");
    }

    /** Returns true if the title contains at least one financial/market/geopolitics keyword. */
    private boolean isFinanciallyRelevant(String title) {
        if (title == null || title.isBlank()) return false;
        return FINANCE_PATTERN.matcher(title).find();
    }

    /**
     * Ticker-specific news — Brave primary (query by symbol + company name), RSS supplement.
     * Cached 15 min.
     */
    @Cacheable(value = "news", key = "#symbol.toUpperCase()")
    public ApiResponse<List<NewsItem>> getTickerNews(String symbol) {
        String sym = symbol.toUpperCase();
        List<NewsItem> items = new ArrayList<>();

        // Primary: Brave News API — searches across Reuters, Bloomberg, FT, WSJ, CNBC, etc.
        items.addAll(fetchBraveNews(sym + " stock earnings results", 15));
        items.addAll(fetchBraveNews(sym + " company news analysis", 8));

        // Yahoo Finance RSS — ticker-specific, very reliable
        items.addAll(fetchRss(String.format(YAHOO_RSS, sym), "Yahoo Finance", 8));

        // Google News — broad coverage
        items.addAll(fetchRss(String.format(GOOGLE_NEWS_RSS, sym), "Google News", 8));

        // Alpha Vantage with sentiment scoring
        if (alphaVantageKey != null && !alphaVantageKey.isBlank()) {
            items.addAll(fetchAlphaVantageNews(sym, null, 10));
        }

        Instant cutoff48h = Instant.now().minus(48, java.time.temporal.ChronoUnit.HOURS);
        List<NewsItem> result = deduplicate(items).stream()
                .filter(item -> item.getPublishedAt() == null || item.getPublishedAt().isAfter(cutoff48h))
                .sorted(Comparator.comparing(NewsItem::getPublishedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .collect(Collectors.toList());

        return result.isEmpty()
            ? ApiResponse.error("No news found for " + sym)
            : ApiResponse.success(result, "news_aggregated");
    }

    // ─── Brave News API ──────────────────────────────────────────────────────────

    private List<NewsItem> fetchBraveNews(String query, int count) {
        if (braveApiKey == null || braveApiKey.isBlank()) return Collections.emptyList();
        try {
            String url = UriComponentsBuilder.fromHttpUrl(BRAVE_NEWS_URL)
                    .queryParam("q", query)
                    .queryParam("count", Math.min(count, 20))
                    .queryParam("search_lang", "en")
                    .queryParam("country", "us")
                    .queryParam("freshness", "pd") // past day
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Subscription-Token", braveApiKey);
            headers.set(HttpHeaders.ACCEPT, "application/json");

            ResponseEntity<BraveNewsResponse> resp = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), BraveNewsResponse.class);

            if (resp.getBody() == null || resp.getBody().getResults() == null)
                return Collections.emptyList();

            return resp.getBody().getResults().stream()
                    .map(r -> NewsItem.builder()
                            .title(r.getTitle())
                            .url(r.getUrl())
                            .source(r.getSource() != null ? r.getSource().getName() : "News")
                            .summary(r.getDescription())
                            .publishedAt(parseBraveAge(r.getAge()))
                            .sentiment("Neutral")
                            .imageUrl(r.getThumbnail() != null ? r.getThumbnail().getSrc() : null)
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.debug("Brave news failed [{}]: {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    /** Converts Brave's human-readable age ("2 hours ago") to an Instant. */
    private Instant parseBraveAge(String age) {
        if (age == null || age.isBlank()) return Instant.now();
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("(\\d+)\\s+(second|minute|hour|day|week)")
                .matcher(age.toLowerCase());
        if (!m.find()) return Instant.now();
        long val = Long.parseLong(m.group(1));
        long millis = switch (m.group(2)) {
            case "second" -> val * 1_000L;
            case "minute" -> val * 60_000L;
            case "hour"   -> val * 3_600_000L;
            case "day"    -> val * 86_400_000L;
            case "week"   -> val * 604_800_000L;
            default       -> 0L;
        };
        return Instant.now().minusMillis(millis);
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BraveNewsResponse {
        private List<BraveArticle> results;

        @Data @JsonIgnoreProperties(ignoreUnknown = true)
        public static class BraveArticle {
            private String title;
            private String url;
            private String description;
            private String age;
            private BraveSource source;
            private BraveThumbnail thumbnail;
        }

        @Data @JsonIgnoreProperties(ignoreUnknown = true)
        public static class BraveSource { private String name; }

        @Data @JsonIgnoreProperties(ignoreUnknown = true)
        public static class BraveThumbnail { private String src; }
    }

    // ─── RSS fetching & parsing ──────────────────────────────────────────────────

    private List<NewsItem> fetchRss(String url, String sourceName) {
        return fetchRss(url, sourceName, 4);
    }

    private List<NewsItem> fetchRss(String url, String sourceName, int maxItems) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.USER_AGENT,
                "Mozilla/5.0 (compatible; MarketFeedBot/1.0)");
            headers.set(HttpHeaders.ACCEPT, "application/rss+xml, application/xml, text/xml");
            ResponseEntity<String> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return Collections.emptyList();
            }
            return parseRss(resp.getBody(), sourceName, maxItems);
        } catch (Exception e) {
            log.debug("RSS fetch failed [{}]: {}", sourceName, e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<NewsItem> parseRss(String xml, String sourceName) {
        return parseRss(xml, sourceName, 4);
    }

    private List<NewsItem> parseRss(String xml, String sourceName, int maxItems) {
        List<NewsItem> items = new ArrayList<>();
        try {
            // Strip leading BOM / whitespace that breaks some parsers
            String cleaned = xml.trim().replaceFirst("^([\\W]+)<", "<");
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            Document doc = factory.newDocumentBuilder()
                .parse(new ByteArrayInputStream(cleaned.getBytes(StandardCharsets.UTF_8)));

            NodeList itemNodes = doc.getElementsByTagName("item");
            for (int i = 0; i < itemNodes.getLength() && i < maxItems; i++) {
                Element el     = (Element) itemNodes.item(i);
                String title   = text(el, "title");
                String link    = text(el, "link");
                String desc    = text(el, "description");
                String pubDate = text(el, "pubDate");
                String source  = text(el, "source");
                if (source == null || source.isBlank()) source = sourceName;

                if (title == null || title.isBlank()) continue;

                // Extract thumbnail image
                String imageUrl = extractImageUrl(el, desc, link);

                items.add(NewsItem.builder()
                    .title(cleanHtml(title))
                    .url(link)
                    .source(source)
                    .summary(cleanHtml(desc))
                    .publishedAt(parseDate(pubDate))
                    .sentiment("Neutral")
                    .imageUrl(imageUrl)
                    .build());
            }
        } catch (Exception e) {
            log.debug("RSS parse failed [{}]: {}", sourceName, e.getMessage());
        }
        return items;
    }

    private String text(Element parent, String tag) {
        NodeList nl = parent.getElementsByTagName(tag);
        if (nl.getLength() == 0) return null;
        return nl.item(0).getTextContent();
    }

    private String extractImageUrl(Element el, String desc, String articleUrl) {
        // 1. <media:content url="..."> — most RSS feeds with images
        for (String tag : List.of("media:content", "content", "media:thumbnail", "thumbnail")) {
            NodeList nl = el.getElementsByTagName(tag);
            if (nl.getLength() > 0) {
                String url = ((Element) nl.item(0)).getAttribute("url");
                if (url != null && !url.isBlank()) return url;
            }
        }
        // 2. <enclosure url="..."> — podcast-style enclosures
        NodeList enclosures = el.getElementsByTagName("enclosure");
        if (enclosures.getLength() > 0) {
            String url  = ((Element) enclosures.item(0)).getAttribute("url");
            String type = ((Element) enclosures.item(0)).getAttribute("type");
            if (url != null && !url.isBlank() && (type == null || type.startsWith("image"))) return url;
        }
        // 3. <img src="..."> embedded in the description HTML
        if (desc != null) {
            java.util.regex.Matcher m =
                java.util.regex.Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(desc);
            if (m.find()) {
                String url = m.group(1);
                if (!url.contains("pixel") && !url.contains("tracker") && !url.contains("beacon")) return url;
            }
        }
        // 4. Fallback: Google favicon for the publication domain
        if (articleUrl != null && !articleUrl.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(articleUrl);
                String domain = uri.getHost();
                if (domain != null) {
                    domain = domain.replaceFirst("^www\\.", "");
                    return "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128";
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String cleanHtml(String s) {
        if (s == null) return null;
        return s.replaceAll("<[^>]+>", "").replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
                .replaceAll("&quot;", "\"").replaceAll("&#39;", "'")
                .replaceAll("&nbsp;", " ").trim();
    }

    private static final List<DateTimeFormatter> DATE_FMTS = List.of(
        DateTimeFormatter.RFC_1123_DATE_TIME,                            // RSS standard
        DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss", Locale.ENGLISH) // Alpha Vantage
    );

    private Instant parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        for (DateTimeFormatter fmt : DATE_FMTS) {
            try {
                return ZonedDateTime.parse(s.trim(), fmt).toInstant();
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ─── Alpha Vantage (supplementary) ──────────────────────────────────────────

    private List<NewsItem> fetchAlphaVantageNews(String ticker, String topics, int limit) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(AV_NEWS_URL)
                .queryParam("function", "NEWS_SENTIMENT")
                .queryParam("limit", limit)
                .queryParam("sort", "LATEST")
                .queryParam("apikey", alphaVantageKey);
            if (ticker != null) builder.queryParam("tickers", ticker);
            if (topics != null) builder.queryParam("topics", topics);

            AvNewsResponse response = restTemplate.getForObject(
                builder.toUriString(), AvNewsResponse.class);
            if (response == null || response.getFeed() == null
                    || response.getInformation() != null) return Collections.emptyList();

            return response.getFeed().stream().map(a -> NewsItem.builder()
                .title(a.getTitle())
                .url(a.getUrl())
                .source(a.getSource() != null ? a.getSource() : "Alpha Vantage")
                .summary(a.getSummary())
                .publishedAt(parseDate(a.getTimePublished()))
                .sentiment(a.getOverallSentimentLabel() != null
                    ? a.getOverallSentimentLabel() : "Neutral")
                .imageUrl(a.getBannerImage())
                .build()).collect(Collectors.toList());
        } catch (Exception e) {
            log.debug("Alpha Vantage news failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ─── Deduplication ──────────────────────────────────────────────────────────

    /** Remove items with near-duplicate titles (first 60 chars match). */
    private List<NewsItem> deduplicate(List<NewsItem> items) {
        Set<String> seen = new LinkedHashSet<>();
        List<NewsItem> out = new ArrayList<>();
        for (NewsItem item : items) {
            if (item.getTitle() == null) continue;
            String key = item.getTitle().toLowerCase()
                .replaceAll("[^a-z0-9]", "")
                .substring(0, Math.min(60, item.getTitle().replaceAll("[^a-zA-Z0-9]", "").length()));
            if (seen.add(key)) out.add(item);
        }
        return out;
    }

    // ─── Alpha Vantage POJOs ────────────────────────────────────────────────────

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AvNewsResponse {
        private String information;
        @JsonProperty("feed")
        private List<Article> feed;

        @Data @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Article {
            private String title;
            private String url;
            private String summary;
            private String source;
            @JsonProperty("time_published")     private String timePublished;
            @JsonProperty("banner_image")       private String bannerImage;
            @JsonProperty("overall_sentiment_label") private String overallSentimentLabel;
        }
    }
}
