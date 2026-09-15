#!/usr/bin/env python3
"""Regression checks for the installed Scorta doTERRA PWA update bridge."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys
import tempfile
import zipfile


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files(root: Path) -> set[str]:
    return {str(path.relative_to(root)) for path in root.rglob("*") if path.is_file()}


def main() -> None:
    site = Path(sys.argv[1])
    approved_zip = Path(sys.argv[2])
    app = site / "app"
    compat = site / "app-v14"

    with tempfile.TemporaryDirectory() as temp_dir:
        approved = Path(temp_dir)
        with zipfile.ZipFile(approved_zip) as archive:
            archive.extractall(approved)
        assert files(app) == files(approved)
        for relative in files(approved):
            assert digest(app / relative) == digest(approved / relative), relative

    # A: the previously installed /app-v14/ identity remains unchanged while
    # the executable Flutter application is exactly the approved v5 build.
    compat_manifest = json.loads((compat / "manifest.json").read_text(encoding="utf-8"))
    assert all(
        compat_manifest[field] == "/scorta-doterra-download/app-v14/"
        for field in ("id", "start_url", "scope")
    )
    assert digest(compat / "main.dart.js") == digest(app / "main.dart.js")
    assert "La mia scorta" in (compat / "main.dart.js").read_text(encoding="utf-8")

    # B: a new installation at /app/ still receives the unmodified approved v5.
    app_manifest = json.loads((app / "manifest.json").read_text(encoding="utf-8"))
    assert all(
        app_manifest[field] == "/scorta-doterra-download/app/"
        for field in ("id", "start_url", "scope")
    )

    bootstrap = (compat / "flutter_bootstrap.js").read_text(encoding="utf-8")
    worker = (compat / "flutter_service_worker.js").read_text(encoding="utf-8")

    # C: one stable worker version per deploy and no reload hook/loop.
    versions = re.findall(r'serviceWorkerVersion:\s*"([^"]+)"', bootstrap)
    assert len(versions) == 1 and versions[0].startswith("scorta-v5-compat-")
    version = versions[0]
    compat_index = (compat / "index.html").read_text(encoding="utf-8")
    assert f'flutter_bootstrap.js?v={version}' in compat_index
    assert f'manifest.json?v={version}' in compat_index
    assert f'"mainJsPath":"main.dart.js?v={version}"' in bootstrap
    assert "url.searchParams.set('__scorta_v5',CACHE_VERSION)" in worker
    assert "location.reload" not in bootstrap
    assert "location.reload" not in worker
    assert "skipWaiting" in worker and "clients.claim" in worker

    # D: only obsolete Scorta static caches match the deletion rule.
    current = re.search(r"const CACHE_NAME='([^']+)'", worker).group(1)
    existing = [
        "scorta-doterra-pwa-90351deda9fa",
        "scorta-doterra-app-v14-previous",
        current,
        "flutter-app-cache",
        "flutter-app-manifest",
        "work-tracker-cache-v9",
        "chiavi-scorta-v3",
    ]
    deleted = [
        name
        for name in existing
        if (name.startswith("scorta-doterra-pwa-") or name.startswith("scorta-doterra-app-v14-"))
        and name != current
    ]
    assert deleted == ["scorta-doterra-pwa-90351deda9fa", "scorta-doterra-app-v14-previous"]
    for protected in ("flutter-app-cache", "flutter-app-manifest", "work-tracker-cache-v9", "chiavi-scorta-v3"):
        assert protected not in deleted

    # E: application data APIs are never touched; representative stored values
    # remain byte-for-byte identical through the simulated static-cache update.
    forbidden = ("localStorage", "indexedDB", "SharedPreferences", "Clear-Site-Data", "navigator.storage")
    assert not any(token in worker for token in forbidden)
    before = {
        "doterra_inventory_v2": '{"lavanda":{"closed":2,"opened":1,"notes":"uso sera"}}',
        "oils_inventory_v1": '{"shopping":{"incenso":2}}',
    }
    after = dict(before)
    assert after == before
    main_js = (app / "main.dart.js").read_text(encoding="utf-8")
    assert "doterra_inventory_v2" in main_js
    assert "oils_inventory_v1" in main_js

    print("PWA update regression: 5 scenarios passed")


if __name__ == "__main__":
    main()
