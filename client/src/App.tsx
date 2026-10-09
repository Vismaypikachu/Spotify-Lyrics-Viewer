import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  makeStyles
} from "@material-ui/core";
import { setBasepath, useRedirect, useRoutes } from "hookrouter";
import React, { useEffect, useState } from "react";
import { deleteSession, spotifyGetCurrentToken } from "./api";
import MetaTags from "./components/MetaTags";
import Navigation from "./components/Navigation";
import Player from "./components/Player";
import config from "./config";
import useCurrentlyPlayingSong from "./hooks/useCurrentlyPlayingSong";
import useLyrics from "./hooks/useLyrics";
import useThemeState from "./hooks/useThemeState";
import useTokenRefresh from "./hooks/useTokenRefresh";
import useUser from "./hooks/useUser";
import About from "./pages/About";
import LyricsView from "./pages/LyricsView";
import NotFound from "./pages/NotFound";
import SpotifyAuthorization from "./pages/SpotifyAuthorization";
import { IToken } from "./types/token";
import QueueSidebar from "./components/QueueSidebar";

const App: React.FC = () => {
  const [token, setToken] = useState<IToken | null>(null);

  const onNewToken = (accessToken: string, expiresAt: number) => {
    setToken({ expiry: new Date(expiresAt), value: accessToken } as IToken);
  };
  const clearToken = () => {
    setToken(null);
    deleteSession();
  };

  if (config.client.basename !== undefined) {
    // Needed when we have a subdirectory in the url to adjust the links on home, about, etc
    setBasepath(config.client.basename);
  }

  const user = useUser(token, clearToken);
  useTokenRefresh(token, onNewToken, clearToken);
  const currentlyPlayingSong = useCurrentlyPlayingSong(token, clearToken);
  const lyrics = useLyrics(currentlyPlayingSong);
  const { theme, toggleTheme, darkModeEnabled } = useThemeState();

  // Request for a token on load to see if data is already in the state
  useEffect(() => {
    spotifyGetCurrentToken().then(newToken => {
      if (newToken !== null) {
        onNewToken(newToken.access_token, newToken.expires_at);
      }
    });
  }, []);

  const routes = {
    "/": () => (
      <MetaTags
        route="/"
        description="View the lyrics of the current song playing on your Spotify account in your browser."
      >
        <LyricsView user={user} currentlyPlayingSong={currentlyPlayingSong} lyrics={lyrics} />
      </MetaTags>
    ),
    "/about": () => (
      <MetaTags
        route="/about"
        titlePrefix="About - "
        description="Spotify Lyrics Viewer is a tool that allows you to view the lyrics of the current playing song on Spotify."
      >
        <About />
      </MetaTags>
    ),
    "/spotify-authorization": () => <SpotifyAuthorization onNewToken={onNewToken} />,
    "/spotify-authorization/": () => <SpotifyAuthorization onNewToken={onNewToken} />
  };
  const routeResult = useRoutes(routes);
  useRedirect("/about/", "/about");

  const classes = useStyles();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%" }}>
        <Navigation
          user={user}
          onLogout={clearToken}
          onThemeToggle={toggleTheme}
          isDarkMode={darkModeEnabled}
        />

        <Box py={3} style={{ overflow: "auto" }}>
          <Container maxWidth="xl">
            <Box className={classes.contentLayout}>
              <Box className={classes.mainContent}>
                {routeResult ?? <NotFound />}
              </Box>

              <Box className={classes.queueColumn}>
                <QueueSidebar
                  currentTrackId={
                    currentlyPlayingSong.currentlyPlayingObject?.item?.id ?? null
                  }
                />
              </Box>
            </Box>
          </Container>
        </Box>

        <Player currentlyPlayingSong={currentlyPlayingSong} token={token} />
      </div>
    </ThemeProvider>
  );
};

const useStyles = makeStyles(theme => ({
  contentLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 280px",
    gap: theme.spacing(3),
    alignItems: "start",

    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "minmax(0, 1fr)"
    }
  },

  mainContent: {
    minWidth: 0
  },

  
  queueColumn: {
    position: "fixed",
    top: 145,
    right: 24,
    width: 350,
    maxHeight: "calc(100vh - 245px)",
    overflowY: "auto",
    overflowX: "hidden",
    zIndex: 10,

    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  }
}));

export default App;
