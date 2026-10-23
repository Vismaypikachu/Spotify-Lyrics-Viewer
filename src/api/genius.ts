import axios from "axios";
import cheerio from "cheerio";
import diacritics from "diacritics";
import { IFoundLyrics } from "../dto";

export interface Stats {
  unreviewed_annotations: number;
  hot: boolean;
  pageviews?: number;
}

export interface PrimaryArtist {
  api_path: string;
  header_image_url: string;
  id: number;
  image_url: string;
  is_meme_verified: boolean;
  is_verified: boolean;
  name: string;
  url: string;
}

export interface Result {
  annotation_count: number;
  api_path: string;
  full_title: string;
  header_image_thumbnail_url: string;
  header_image_url: string;
  id: number;
  lyrics_owner_id: number;
  lyrics_state: string;
  path: string;
  pyongs_count?: number;
  song_art_image_thumbnail_url: string;
  song_art_image_url: string;
  stats: Stats;
  title: string;
  title_with_featured: string;
  url: string;
  song_art_primary_color: string;
  song_art_secondary_color: string;
  song_art_text_color: string;
  primary_artist: PrimaryArtist;
}

export interface Hit {
  highlights: any[];
  index: string;
  type: string;
  result: Result;
}

export interface ISearchResponse {
  hits: Hit[];
}

export interface ISearchApiResponse {
  response: ISearchResponse;
}

export async function searchGenius(
  term: string,
  geniusApiToken: string
): Promise<ISearchResponse> {
  const parameters = new URLSearchParams({
    access_token: geniusApiToken,
    q: term
  });

  const requestUrl = `https://api.genius.com/search?${parameters}`;

  try {
    const response = await axios.get<ISearchApiResponse>(requestUrl);

    const searchResults = response.data.response;

    // console.log("Genius query:", term);
    // console.log(
    //   "Genius results:",
    //   searchResults.hits.map(hit => hit.result.full_title)
    // );

    return searchResults;
  } catch (error) {
    console.error("Genius search failed for:", term, error);
    return { hits: [] };
  }
}

const getGeniusPath = async (
  artists: string[],
  title: string,
  albumName: string,
  durationMs: number,
  geniusApiToken: string
) => {
  const search1 = await searchGenius(`${artists[0]} ${title}`, geniusApiToken);
  if (
    search1.hits.length > 0 &&
    search1.hits[0].result.primary_artist.name.indexOf(artists[0]) !== -1
  ) {
    return search1.hits[0].result.path;
  }

  const search2 = await searchGenius(`${artists.join(" & ")} ${title}`, geniusApiToken);
  const primaryArtistInSearch2 = artists.reduce(
    (acc, curr) =>
      acc ||
      (search2.hits.length > 0 && search2.hits[0].result.primary_artist.name.indexOf(curr) !== -1),
    false
  );
  if (search2.hits.length !== 0 && primaryArtistInSearch2) {
    return search2.hits[0].result.path;
  }

  if (search1.hits.length > 0) {
    return search1.hits[0].result.path;
  }

  return null;
};

function getTitle($: CheerioStatic) {
  const title = $("meta[property='og:title']").attr("content");

  if (title) {
    return title.replace(/\s*Lyrics\s*$/i, "").trim();
  }

  return "";
}

function getArtist($: CheerioStatic) {
  const artist = $("meta[property='og:description']").attr("content");

  if (artist) {
    const match = artist.match(/^(.+?)\s*-\s*.+$/);

    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function getLyricContents($: CheerioStatic) {
  const containers = $("div[data-lyrics-container='true']");

  if (containers.length === 0) {
    return "";
  }

  containers.find("br").replaceWith("\n");

  let lyrics = containers
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(text => text !== "")
    .join("\n\n")
    .trim();

  // Remove Genius metadata before the first lyrics section.
  const firstSection = lyrics.search(/\[(Intro|Verse|Pre-Chorus|Chorus|Bridge|Outro|Hook|Refrain|Post-Chorus)/i);

  if (firstSection !== -1) {
    lyrics = lyrics.substring(firstSection).trim();
  }

  return lyrics;
}

export const getLyricsForPath = async (
  geniusPath: string,
  artist: string,
  title: string
): Promise<IFoundLyrics | null> => {
  const requestUrl = `https://genius.com${geniusPath}`;

  try {
    const response = await axios.get<string>(requestUrl, {
      validateStatus: status => status === 200 || status === 404
    });

    if (response.status === 404) {
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html); // Load in the page
    const lyrics = getLyricContents($);

    if (lyrics === "") {
      return null;
    }

    return {
      artist,
      title,
      plainLyrics: lyrics,
      attribution: requestUrl,
      syncedLyrics: null
    } as IFoundLyrics;
  } catch (e) {
    // Anything non-200 or 404 is considered an error
    console.warn(`Failed to call '${requestUrl}'`);

    if (e instanceof Error && e.stack !== undefined) {
      console.warn(e.stack);
    }

    if (axios.isAxiosError(e)) {
      if (e.response !== undefined) {
        console.log(`Response: HTTP${e.response.status} ${e.response.statusText}`);
        console.log(`Response headers: ${JSON.stringify(e.response.headers)}`);
        console.log(`Response data: ${JSON.stringify(e.response.data)}`);
      } else {
        console.log("No response");
      }
    } else {
      console.warn(e);
    }

    return null;
  }
};


export const getLyrics = async (
  artists: string[],
  title: string,
  albumName: string,
  durationMs: number,
  geniusApiToken: string,
  isLocalTrack = false
): Promise<IFoundLyrics | null> => {
  const validArtists = artists.filter(
    artist =>
      artist.trim() !== "" &&
      !/^unknown artist$/i.test(artist.trim())
  );

  if (isLocalTrack || validArtists.length === 0) {
    const normalize = (value: string) =>
      diacritics
        .remove(value)
        .toLowerCase()
        .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // Search the full title first so remix-specific results can win.
    const searchTitles = [
      title,
      title.replace(
        /\s*[\[(](?:bonus track|deluxe edition|bonus edition|explicit version|clean version|single version|album version)[\])]\s*$/i,
        ""
      ).trim()
    ].filter((value, index, values) => value && values.indexOf(value) === index);

    for (const searchTitle of searchTitles) {
      const searchTerm = `${validArtists[0]} ${searchTitle}`;

      const search = await searchGenius(searchTerm, geniusApiToken);

      // console.log(
      //   "Genius search results:",
      //   search?.hits.map(hit => hit.result.full_title)
      // );

      if (!search || search.hits.length === 0) {
        continue;
      }

      const normalizedTitle = normalize(searchTitle);

      const matchingHit =
        search.hits.find(
          hit => normalize(hit.result.title) === normalizedTitle
        ) ??
        search.hits.find(hit => {
          const resultTitle = normalize(hit.result.title);
          return (
            resultTitle.includes(normalizedTitle) ||
            normalizedTitle.includes(resultTitle)
          );
        });

      if (matchingHit) {
        return getLyricsForPath(
          matchingHit.result.path,
          matchingHit.result.primary_artist.name,
          matchingHit.result.title
        );
      }
    }

    return null;
  }

  // Preserve existing behavior for regular Spotify tracks.
  const geniusPath = await getGeniusPath(
    validArtists,
    title,
    albumName,
    durationMs,
    geniusApiToken
  );

  if (geniusPath === null) {
    return null;
  }

  return getLyricsForPath(
    geniusPath,
    validArtists[0],
    title
  );
};

