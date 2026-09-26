"""Rate-limit configuration for the single-process local/share demo servers."""

import os

from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def client_address():
    # Caddy overwrites this header from Cloudflare's server-provided client-IP header.
    return request.headers.get("X-GovBridge-Client-IP") or get_remote_address()


limiter = Limiter(
    key_func=client_address,
    default_limits=["120 per minute"],
    storage_uri=os.environ.get("GOVBRIDGE_LIMITER_STORAGE_URI", "memory://"),
    headers_enabled=True,
)
