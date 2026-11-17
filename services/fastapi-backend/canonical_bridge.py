"""Bounded calls to the existing canonical account/judge service.

Only fixed application routes call this adapter. No actor ID, verdict or reward
is fabricated by FastAPI. Express owns sessions, password hashes and judging.
"""
import os
from typing import Annotated
from urllib.parse import urlsplit

import httpx
from fastapi import Depends
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from errors import DomainError


def bearer(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))]) -> str:
    if not credentials:
        raise DomainError(401, 'UNAUTHORIZED', 'Valid Bearer session required.')
    return credentials.credentials


Token = Annotated[str, Depends(bearer)]


def forward(method: str, path: str, *, token: str | None = None, payload=None, params=None):
    base = os.environ.get('EXPRESS_INTERNAL_URL', 'http://127.0.0.1:4001')
    parsed = urlsplit(base)
    if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {'', '/'}:
        raise DomainError(503, 'BRIDGE_MISCONFIGURED', 'Configure EXPRESS_INTERNAL_URL as an internal origin.')
    if not path.startswith('/api/'):
        raise ValueError('Only fixed API paths may be forwarded')
    try:
        with httpx.Client(base_url=base, timeout=60, follow_redirects=False, trust_env=False) as client:
            response = client.request(method, path, headers={'Authorization': 'Bearer '+token} if token else {},
                                      json=payload, params=params)
        if response.status_code == 204:
            return Response(status_code=204)
        if response.status_code >= 500:
            # Preserve structured service failures (not arbitrary upstream HTML).
            body = response.json()
            if not isinstance(body, dict) or 'error' not in body:
                raise ValueError('Invalid upstream failure')
        else:
            body = response.json()
        if 300 <= response.status_code < 400:
            raise ValueError('Unexpected redirect')
        return JSONResponse(body, status_code=response.status_code)
    except (httpx.HTTPError, ValueError) as exc:
        raise DomainError(503, 'CANONICAL_SERVICE_UNAVAILABLE', 'The shared account/learning service is unavailable; no local fallback was used.') from exc
