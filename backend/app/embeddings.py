"""Gemini text embeddings shared by internship indexing and search."""
import math
import os

from google import genai
from google.genai import types

EMBEDDING_DIMENSIONS = 1536


def embed_text(text: str) -> list[float]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required for semantic internship matching")

    client = genai.Client(api_key=api_key)
    response = client.models.embed_content(
        model=os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
    )
    if not response.embeddings or not response.embeddings[0].values:
        raise RuntimeError("The embedding provider returned an empty vector")

    values = [float(value) for value in response.embeddings[0].values]
    if len(values) != EMBEDDING_DIMENSIONS:
        raise RuntimeError(f"Expected {EMBEDDING_DIMENSIONS} embedding values")

    # gemini-embedding-001 requires normalization when using a reduced dimension.
    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        raise RuntimeError("The embedding provider returned a zero vector")
    return [value / norm for value in values]
