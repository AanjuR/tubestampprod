import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import "./Timestamp.css";

const API_KEY = import.meta.env.VITE_FIREBASE_YOUTUBE_API_KEY;

const generateTimestampsFn = httpsCallable(functions, "generate_timestamps");

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/|embed\/)[\w-]{11}|youtu\.be\/[\w-]{11})(\S*)?$/;

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

function formatDuration(iso) {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatViews(count) {
  if (!count) return "";
  return Number(count).toLocaleString();
}

function Timestamp() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState("");

  const loadVideo = async (videoId, signal) => {
    setLoading(true);
    const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      if (!API_KEY) {
        throw new Error("Missing YouTube API key");
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${API_KEY}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      const item = data.items && data.items[0];

      if (!item) {
        setVideo(null);
        setError("Video not found. It may be private, removed, or unavailable.");
        return;
      }

      const snippet = item.snippet || {};
      const thumbs = snippet.thumbnails || {};
      const best = thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default;

      setError("");
      setVideo({
        id: videoId,
        title: snippet.title,
        author: snippet.channelTitle,
        thumbnail: (best && best.url) || fallbackThumbnail,
        duration: formatDuration(item.contentDetails && item.contentDetails.duration),
        views: formatViews(item.statistics && item.statistics.viewCount),
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      setVideo({
        id: videoId,
        title: "",
        author: "",
        thumbnail: fallbackThumbnail,
        duration: "",
        views: "",
      });
      setError("We couldn't load the video details. Showing the thumbnail only.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load a preview (debounced) as the user types or pastes a URL.
  useEffect(() => {
    const value = url.trim();

    if (!value) {
      setVideo(null);
      setError("");
      setLoading(false);
      setTimestamps([]);
      setTsError("");
      return;
    }

    if (!YOUTUBE_URL_REGEX.test(value)) {
      setVideo(null);
      return;
    }

    const videoId = extractVideoId(value);
    if (!videoId) return;

    const controller = new AbortController();
    const timer = setTimeout(() => loadVideo(videoId, controller.signal), 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  const generateTimestamps = async (videoId) => {
    setTsLoading(true);
    setTsError("");
    setTimestamps([]);

    try {
      const result = await generateTimestampsFn({ videoId });
      const data = result.data && result.data.timestamps;
      if (Array.isArray(data) && data.length > 0) {
        setTimestamps(data);
      } else {
        setTsError("No timestamps could be generated for this video.");
      }
    } catch (err) {
      setTsError(
        err && err.message
          ? err.message
          : "Something went wrong generating timestamps."
      );
    } finally {
      setTsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = url.trim();

    if (!value) {
      setError("Please enter a YouTube video URL.");
      return;
    }

    if (!YOUTUBE_URL_REGEX.test(value)) {
      setError("That doesn't look like a valid YouTube URL. Please try again.");
      return;
    }

    const videoId = extractVideoId(value);
    if (!videoId) {
      setError("Could not read the video ID from that URL. Please try again.");
      return;
    }

    setError("");
    loadVideo(videoId);
    generateTimestamps(videoId);
  };

  return (
    <section id="timestamps" className="timestamp timestamp--card">
      <div className="timestamp__content">
        <h2 className="timestamp__title">
          <span className="timestamp__highlight">Enter your YouTube video URL</span>
        </h2>

        <form className="timestamp__form" onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            className={`timestamp__input${error ? " timestamp__input--error" : ""}`}
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError("");
            }}
            aria-label="YouTube video URL"
            aria-invalid={Boolean(error)}
          />
          <button type="submit" className="timestamp__submit" disabled={loading}>
            {loading ? "Loading..." : "Submit"}
          </button>
        </form>

        {error && <p className="timestamp__error">{error}</p>}

        {video && (
          <div className="timestamp__preview">
            <a
              className="timestamp__thumb-link"
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img
                className="timestamp__thumb"
                src={video.thumbnail}
                alt={video.title || "YouTube video thumbnail"}
                loading="lazy"
              />
              {video.duration && (
                <span className="timestamp__duration">{video.duration}</span>
              )}
            </a>
            <div className="timestamp__meta">
              {video.title && (
                <p className="timestamp__video-title">{video.title}</p>
              )}
              {video.author && (
                <p className="timestamp__video-author">{video.author}</p>
              )}
              {video.views && (
                <p className="timestamp__video-stats">{video.views} views</p>
              )}
            </div>
          </div>
        )}

        {tsLoading && (
          <p className="timestamp__status">Generating timestamps...</p>
        )}

        {tsError && !tsLoading && (
          <p className="timestamp__error">{tsError}</p>
        )}

        {timestamps.length > 0 && !tsLoading && (
          <div className="timestamp__chapters">
            <h3 className="timestamp__chapters-title">Timestamps</h3>
            <ul className="timestamp__list">
              {timestamps.map((ts) => (
                <li key={ts.time} className="timestamp__item">
                  <a
                    className="timestamp__jump"
                    href={`https://www.youtube.com/watch?v=${video ? video.id : ""}&t=${ts.time}s`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="timestamp__time">
                      {ts.display || ts.time}
                    </span>
                    <span className="timestamp__label">{ts.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default Timestamp;
