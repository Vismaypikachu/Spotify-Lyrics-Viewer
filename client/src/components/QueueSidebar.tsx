
import {
    Box,
    Typography,
    makeStyles
} from "@material-ui/core";
import React, { useEffect, useState } from "react";

interface QueueItem {
    id: string;
    name: string;
    artists: string[];
    imageUrl: string | null;
    type: string;
}

interface QueueSidebarProps {
    currentTrackId: string | null;
}

const QueueSidebar: React.FC<QueueSidebarProps> = ({
    currentTrackId
}) => {
    const classes = useStyles();
    const [queue, setQueue] = useState<QueueItem[]>([]);

    useEffect(() => {
        let cancelled = false;

        const fetchQueue = async () => {
            try {
                const response = await fetch("/api/spotify/queue", {
                    cache: "no-store"
                });

                if (!response.ok) {
                    console.error(
                        "Failed to fetch Spotify queue:",
                        response.status,
                        await response.text()
                    );
                    return;
                }

                const data = await response.json();

                if (!cancelled) {
                    setQueue(data.queue ?? []);
                }
            } catch (error) {
                console.error("Failed to fetch Spotify queue:", error);
            }
        };

        fetchQueue();

        const interval = window.setInterval(fetchQueue, 10000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [currentTrackId]);

    return (
        <Box className={classes.root}>
            <Typography variant="h6" className={classes.heading}>
                Up Next
            </Typography>

            {queue.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    No upcoming songs in the queue.
                </Typography>
            ) : (
                queue.map((item, index) => (
                    <Box key={`${item.id}-${index}`} className={classes.item}>
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt=""
                                className={classes.artwork}
                            />
                        ) : (
                            <Box className={classes.artworkPlaceholder} />
                        )}

                        <Box className={classes.details}>
                            <Typography
                                variant="body2"
                                className={classes.songTitle}
                                title={item.name}
                            >
                                {item.name}
                            </Typography>

                            <Typography
                                variant="caption"
                                color="textSecondary"
                                className={classes.artist}
                                title={item.artists.join(", ")}
                            >
                                {item.artists.join(", ")}
                            </Typography>
                        </Box>
                    </Box>
                ))
            )}
        </Box>
    );
};

const useStyles = makeStyles(theme => ({
    root: {
        width: "100%",
        minWidth: 0,
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.background.paper
    },
    heading: {
        fontWeight: 700,
        marginBottom: theme.spacing(2)
    },
    item: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        minWidth: 0,
        marginBottom: theme.spacing(1.5)
    },
    artwork: {
        width: 44,
        height: 44,
        flexShrink: 0,
        objectFit: "cover",
        borderRadius: 3
    },
    artworkPlaceholder: {
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 3,
        backgroundColor: theme.palette.action.hover
    },
    details: {
        minWidth: 0,
        flex: 1
    },
    songTitle: {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
    },
    artist: {
        display: "block",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
    }
}));

export default QueueSidebar;
