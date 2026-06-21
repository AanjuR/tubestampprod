"""Cloud Functions for TubeStamp.

Provides an HTTPS callable that generates chapter-style timestamps for a
YouTube video using its transcript (captions) and Google Gemini.
"""

import json
import os

from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app

# For cost control, cap the number of concurrent containers.
set_global_options(max_instances=10)

initialize_app()

# Gemini API key. Prefer a dedicated GEMINI_API_KEY, fall back to BUMP_API_KEY.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("BUMP_API_KEY")

# Roughly how many transcript characters we send to the model. Keeps token
# usage and latency bounded for very long videos.
MAX_TRANSCRIPT_CHARS = 18000


def _format_time(seconds: float) -> str:
    seconds = int(seconds)
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def _fetch_transcript(video_id: str):
    """Return a list of {"start": float, "text": str} caption segments.

    Handles both the newer (instance .fetch) and older (static get_transcript)
    youtube-transcript-api interfaces.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    # youtube-transcript-api >= 1.0 uses an instance-based API.
    try:
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)
        return [{"start": float(s.start), "text": s.text} for s in fetched]
    except AttributeError:
        # Older API (< 1.0) exposed a static method returning dicts.
        data = YouTubeTranscriptApi.get_transcript(video_id)
        return [{"start": float(d["start"]), "text": d["text"]} for d in data]


def _build_transcript_text(segments) -> str:
    """Turn caption segments into compact "[mm:ss] text" lines, truncated."""
    lines = []
    total = 0
    for seg in segments:
        text = " ".join(seg["text"].split())
        if not text:
            continue
        line = f"[{_format_time(seg['start'])}] {text}"
        total += len(line)
        if total > MAX_TRANSCRIPT_CHARS:
            break
        lines.append(line)
    return "\n".join(lines)


def _generate_chapters(transcript_text: str):
    """Ask Gemini to segment the transcript into chapters as JSON."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = (
        "You are given a YouTube video transcript where each line is prefixed "
        "with its timestamp like [m:ss] or [h:mm:ss]. Split the video into "
        "logical chapters that help a viewer navigate it. Return between 4 and "
        "12 chapters covering the whole video. The first chapter must start at "
        "0. For each chapter provide its start time in total seconds and a "
        "short, descriptive title (max ~6 words).\n\n"
        f"Transcript:\n{transcript_text}"
    )

    schema = types.Schema(
        type=types.Type.ARRAY,
        items=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "time": types.Schema(type=types.Type.INTEGER),
                "label": types.Schema(type=types.Type.STRING),
            },
            required=["time", "label"],
        ),
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
        ),
    )

    chapters = json.loads(response.text)
    # Normalize: ints, sorted, deduped, with formatted label.
    cleaned = []
    seen = set()
    for ch in chapters:
        try:
            t = int(ch["time"])
        except (KeyError, TypeError, ValueError):
            continue
        label = str(ch.get("label", "")).strip()
        if t in seen or not label:
            continue
        seen.add(t)
        cleaned.append({"time": t, "label": label, "display": _format_time(t)})
    cleaned.sort(key=lambda c: c["time"])
    return cleaned


@https_fn.on_call()
def generate_timestamps(req: https_fn.CallableRequest):
    """Generate chapter timestamps for a YouTube video.

    Expects req.data = { "videoId": "<11-char id>" }.
    Returns { "timestamps": [ { time, label, display }, ... ] }.
    """
    video_id = (req.data or {}).get("videoId")
    if not video_id or not isinstance(video_id, str):
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "A 'videoId' string is required.",
        )

    if not GEMINI_API_KEY:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            "The timestamp service is not configured (missing API key).",
        )

    # 1. Fetch transcript.
    try:
        segments = _fetch_transcript(video_id)
    except Exception:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.NOT_FOUND,
            "No transcript is available for this video. It may have captions "
            "disabled or be unavailable.",
        )

    if not segments:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.NOT_FOUND,
            "No transcript is available for this video.",
        )

    transcript_text = _build_transcript_text(segments)

    # 2. Generate chapters with the LLM.
    try:
        timestamps = _generate_chapters(transcript_text)
    except Exception as exc:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to generate timestamps: {exc}",
        )

    if not timestamps:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            "Could not generate timestamps for this video.",
        )

    return {"timestamps": timestamps}


@https_fn.on_request()
def on_request_example(req: https_fn.Request) -> https_fn.Response:
    return https_fn.Response("Hello world!")
