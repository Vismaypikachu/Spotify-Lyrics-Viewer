import { Box, Link, Typography } from "@material-ui/core";
import React from "react";

const About: React.FC = () => {
  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <Typography variant="h4" align="center" gutterBottom>
        About
      </Typography>

      <Typography gutterBottom>
        Spotify Lyrics Viewer is a tool that allows you to view the lyrics of
        the current playing song on Spotify.
      </Typography>

      <Typography gutterBottom>
        I loved using the original Spotify Lyrics Viewer, but unfortunately,
        the original site was taken down. I decided to fork the project and
        bring it back online so it could continue to be useful.
      </Typography>

      <Typography gutterBottom>
        To do this, we first log you into Spotify so we can see the current
        song playing. The title and artist are then used to try and find the
        lyrics on{" "}
        <Link href="https://genius.com/" target="_blank" rel="noopener noreferrer">
          GENIUS
        </Link>{" "}
        and whatever lyrics matched the best are displayed to you.
      </Typography>

      <Typography gutterBottom>
        Please note that the lyrics returned may not be for the current
        playing song in some situations due to the lyrics not existing on
        GENIUS or the current playing song's title having extra content aside
        from the actual title.
      </Typography>

      <Box mt={8}>
        <Typography align="center">
          <Link
            href="https://vismaypatel.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vismay's Website
          </Link>
        </Typography>
      </Box>

      <Box mt={16}>
        <Typography align="center">
          <Link
            href="https://github.com/brentvollebregt/spotify-lyrics-viewer"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </Link>
          {" • "}
          Original project by{" "}
          <Link
            href="https://github.com/brentvollebregt"
            target="_blank"
            rel="noopener noreferrer"
          >
            Brent Vollebregt
          </Link>
          {" • "}
          <Link
            href="https://nitratine.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check out Brent's other projects on Nitratine.net
          </Link>
        </Typography>
      </Box>
    </div>
  );
};

export default About;