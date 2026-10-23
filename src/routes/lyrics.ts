
import express from "express";
import { getLyrics as getLyricsFromGenius } from "../api/genius";
import { getLyrics as getLyricsFromLrcLib } from "../api/lrclib";
import config from "../config";

export const subRoute = "/api/lyrics";

const router = express.Router();

router.get("/", async (req, res) => {
  const { artists, title, albumName, duration } = req.query;
  const isLocalTrack = req.query.local === "true";

  if (
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof duration !== "string" ||
    duration.trim() === "" ||
    !Number.isFinite(Number(duration)) ||
    Number(duration) <= 0
  ) {
    res.status(400).send("Please provide a valid 'title' and 'duration'");
    return;
  }

  const artistArray = (
    artists === undefined
      ? []
      : Array.isArray(artists)
        ? artists
        : [artists]
  ).filter(
    (artist): artist is string =>
      typeof artist === "string" && artist.trim() !== ""
  );

  const album = typeof albumName === "string" ? albumName : "";
  const durationMs = Number(duration);

  // Local files: use Genius directly, without querying LRCLIB.
  if (isLocalTrack) {
    if (config.genius.access_token !== undefined) {
      // console.log("Local Genius lookup:", {
      //   title,
      //   artists: artistArray,
      //   album,
      //   tokenConfigured: config.genius.access_token !== undefined
      // });

      const lyricsFromGenius = await getLyricsFromGenius(
        artistArray,
        title,
        album,
        durationMs,
        config.genius.access_token,
        true
      );

      // console.log(
      //   "Local Genius result:",
      //   lyricsFromGenius ? "lyrics found" : "no lyrics found"
      // );

      if (lyricsFromGenius !== null) {
        res.send(lyricsFromGenius);
        return;
      }
    }

    res.status(404).send("Unable to find lyrics");
    return;
  }

  // Regular tracks retain the existing LRCLIB-first behavior.
  if (artistArray.length > 0) {
    const lyricsFromLrcLib = await getLyricsFromLrcLib(
      artistArray,
      title,
      album,
      durationMs
    );

    if (lyricsFromLrcLib !== null) {
      res.send(lyricsFromLrcLib);
      return;
    }
  }

  // Fall back to Genius.
  if (config.genius.access_token !== undefined) {
    const lyricsFromGenius = await getLyricsFromGenius(
      artistArray,
      title,
      album,
      durationMs,
      config.genius.access_token,
      false
    );

    if (lyricsFromGenius !== null) {
      res.send(lyricsFromGenius);
      return;
    }
  }

  res.status(404).send("Unable to find lyrics");
});

export default router;
