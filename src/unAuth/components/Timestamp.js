import { useState } from "react";
import "./Timestamp.css";

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/|embed\/)[\w-]{11}|youtu\.be\/[\w-]{11})(\S*)?$/;

function Timestamp() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

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

    setError("");
    // Valid YouTube URL — ready to process.
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
          <button type="submit" className="timestamp__submit">
            Submit
          </button>
        </form>

        {error && <p className="timestamp__error">{error}</p>}
      </div>
    </section>
  );
}

export default Timestamp;
