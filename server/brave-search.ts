const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

async function braveSearch(query: string, count: number = 5): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      search_lang: "ko",
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Brave search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: BraveSearchResult[] = (data.web?.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));

    return results;
  } catch (error) {
    console.error("Brave search error:", error);
    return [];
  }
}

const LYRIC_DOMAIN_PRIORITIES: Record<string, number> = {
  "bugs.co.kr": 10,
  "melon.com": 8,
  "genie.co.kr": 7,
  "music.naver.com": 6,
  "genius.com": 5,
  "azlyrics.com": 4,
};

function scoreLyricResult(result: BraveSearchResult): number {
  let score = 0;
  for (const [domain, priority] of Object.entries(LYRIC_DOMAIN_PRIORITIES)) {
    if (result.url.includes(domain)) {
      score += priority;
      break;
    }
  }
  if (result.title.includes("가사") || result.description.includes("가사")) {
    score += 3;
  }
  if (result.title.includes("lyrics") || result.description.includes("lyrics")) {
    score += 2;
  }
  return score;
}

export async function searchBraveLyrics(artist: string, title: string): Promise<string | null> {
  const queries = [
    `${artist} ${title} 가사`,
    `${artist} ${title} lyrics`,
  ];

  for (const query of queries) {
    const results = await braveSearch(query, 5);
    if (results.length === 0) continue;

    const scored = results
      .map(r => ({ ...r, score: scoreLyricResult(r) }))
      .sort((a, b) => b.score - a.score);

    if (scored[0] && scored[0].score > 0) {
      return scored[0].url;
    }

    if (scored.length > 0) {
      return scored[0].url;
    }
  }

  return null;
}

export async function searchBraveYoutube(artist: string, title: string): Promise<string | null> {
  const query = `${artist} ${title} official MV site:youtube.com`;
  const results = await braveSearch(query, 5);

  const ytResults = results.filter(r => r.url.includes("youtube.com/watch"));
  if (ytResults.length > 0) {
    return ytResults[0].url;
  }

  const fallbackQuery = `${artist} ${title} site:youtube.com`;
  const fallbackResults = await braveSearch(fallbackQuery, 5);
  const fallbackYt = fallbackResults.filter(r => r.url.includes("youtube.com/watch"));

  if (fallbackYt.length > 0) {
    return fallbackYt[0].url;
  }

  return null;
}
