
import { useEffect, useState } from "react";
import { IFoundLyrics } from "../../../src/dto";
import { getLyrics } from "../api";
import { CurrentlyPlayingState, PlayingStates } from "../types/currentlyPlayingState";
import { ITrackLyrics } from "../types/trackLyrics";

const getLyricsPromiseCache: Record<string, Promise<IFoundLyrics | null>> = {};

const useLyrics = (currentlyPlaying: CurrentlyPlayingState) => {
  const [lyrics, setLyrics] = useState<ITrackLyrics | undefined>(undefined);

  useEffect(() => {
    if (
      (currentlyPlaying.state !== PlayingStates.Playing &&
        currentlyPlaying.state !== PlayingStates.Paused) ||
      currentlyPlaying.currentlyPlayingObject.item === null
    ) {
      setLyrics(undefined);
    } else {
      const item = currentlyPlaying.currentlyPlayingObject.item;

      // The installed Spotify typings omit is_local.
      const isLocalTrack =
        (item as typeof item & { is_local?: boolean }).is_local === true ||
        item.uri?.startsWith("spotify:local:") === true;
      const currentItemId = item.id ?? item.uri;
      const hasSongChanged = currentItemId !== lyrics?.currentlyPlayingItemId;

      const lyricsAreEmpty =
        lyrics?.lyrics?.plainLyrics === undefined &&
        (lyrics?.lyrics?.syncedLyrics ?? undefined) === undefined;

      if (lyrics === undefined || hasSongChanged || lyricsAreEmpty) {
        if (!lyricsAreEmpty) {
          setLyrics(undefined);
        }

        // Detect local files and split "Track Name - Artist".
        const localTitleMatch = isLocalTrack
          ? item.name.match(/^(.+?)\s+-\s+(.+)$/)
          : null;

        const localTitle = localTitleMatch
          ? localTitleMatch[1].trim()
          : item.name;

        const localArtist = localTitleMatch
          ? localTitleMatch[2].trim()
          : "";

        const artists = isLocalTrack
          ? (localArtist ? [localArtist] : [])
          : item.artists.map(x => x.name).filter(Boolean);

        // Preserve existing cleanup for regular Spotify track titles.
        
        const trackNameWithReplacements = localTitle
          .replace(/\s*\(feat.+\)/i, "")
          .replace(/\s*\(ft.+\)/i, "")
          .replace(/\s*\(with.+\)/i, "")
          .replace(/ - \d{4} - Remaster/i, "")
          .replace(/ - (\d{4} )?Remaster(ed)?.*/i, "")
          .replace(/ - Original Album Version/i, "")
          .replace(/\s*\(Live\)/i, "")
          .replace(/ - Acoustic/i, "")
          .replace(/ - from .*/i, "")
          .replace(/ - Live from .*/i, "")
          .replace(/ - Live/i, "")
          .replace(/ - \d{4} Mix/i, "")
          .replace(
            isLocalTrack ? /\s*\(Bonus Track\)\s*$/i : /$^/,
            ""
          )
          .trim();
        
        console.log("Lyrics lookup:", {
          isLocalTrack,
          originalName: item.name,
          title: trackNameWithReplacements,
          artists
        });

        const album = item.album?.name ?? "";

        const getLyricsPromiseCacheKey = JSON.stringify({
          local: isLocalTrack,
          artists,
          title: trackNameWithReplacements,
          album
        });

        const getLyricsPromise =
          getLyricsPromiseCache[getLyricsPromiseCacheKey] ??
          getLyrics(
            artists,
            trackNameWithReplacements,
            album,
            item.duration_ms,
            isLocalTrack
          );

        getLyricsPromiseCache[getLyricsPromiseCacheKey] = getLyricsPromise;

        let didCancel = false;

        const processPromise = async () => {
          try {
            const getLyricsResult = await getLyricsPromise;

            if (didCancel) {
              return;
            }

            setLyrics({
              currentlyPlayingItemId: currentItemId,
              lyrics: getLyricsResult ?? undefined
            });
          } catch (error) {
            if (!didCancel) {
              console.error("Unable to load lyrics:", error);
              setLyrics({
                currentlyPlayingItemId: currentItemId,
                lyrics: undefined
              });
            }
          }
        };

        processPromise();

        return () => {
          didCancel = true;
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentlyPlaying]);

  return lyrics;
};

export default useLyrics;