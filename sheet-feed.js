function webUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    // Blank or malformed spreadsheet cells have no link.
  }
}

export function parseSheetFeed(feed) {
  if (feed.version !== 1 || !Array.isArray(feed.quotes) ||
      !Array.isArray(feed.content) || !Array.isArray(feed.images)) throw new Error("Invalid sheet feed");
  const quotes = [];
  const materials = new Map();
  for (const row of feed.quotes) {
    if (!/^true$/i.test(row.publish) || !/^[a-z0-9-]+$/.test(row.quote_id) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !row.speaker?.trim() ||
        !row.quote?.trim() || materials.has(row.quote_id)) continue;
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== row.date) continue;
    quotes.push({id: row.quote_id, date: row.date, speaker: row.speaker, text: row.quote});
    materials.set(row.quote_id, {
      matchup: row.teams, event: row.game, venue: row.venue,
      location: row.location, gameUrl: webUrl(row.game_url), items: []
    });
  }

  const items = new Map();
  for (const row of feed.content) {
    const material = materials.get(row.quote_id);
    if (!material || !row.item_id || !["Interview", "More Information"].includes(row.panel)) continue;
    const key = JSON.stringify([row.quote_id, row.item_id]);
    if (!items.has(key)) {
      const item = {type: row.panel === "Interview" ? "The interview" : "More information", title: "", blocks: []};
      items.set(key, item);
      material.items.push(item);
    }
    const item = items.get(key);
    if (row.kind === "title") item.title = row.text;
    else if (row.kind === "byline") item.byline = row.text;
    else if (["paragraph", "heading", "turn"].includes(row.kind) && row.text) {
      item.blocks.push({kind: row.kind, order: Number(row.position) || 0, text: row.text, speaker: row.speaker});
    }
    item.url ??= webUrl(row.source_url);
  }
  for (const row of feed.images) {
    const item = items.get(JSON.stringify([row.quote_id, row.item_id]));
    const src = webUrl(row.image_url);
    if (!item || !src) continue;
    item.blocks.push({kind: "image", order: Number(row.position) || 0, src, alt: row.alt_text || "",
      caption: [row.caption, row.credit].filter(Boolean).join(" · ")});
  }
  for (const item of items.values()) item.blocks.sort((a,b) => a.order - b.order);
  return {quotes, materials};
}

export async function loadSheetFeed() {
  try {
    const settings = await fetch(new URL("./archive-feed.json", import.meta.url), {cache:"no-store"});
    if (!settings.ok) return null;
    const {url} = await settings.json();
    if (!url) return null;
    const endpoint = new URL(url);
    if (endpoint.origin !== "https://script.google.com" || !endpoint.pathname.endsWith("/exec")) return null;
    const response = await fetch(endpoint, {cache:"no-store", signal: AbortSignal.timeout(4500)});
    if (!response.ok) return null;
    return parseSheetFeed(await response.json());
  } catch {
    return null;
  }
}
