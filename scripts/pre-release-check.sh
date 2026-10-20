#!/usr/bin/env bash
# Yayın öncesi marka/içerik denetimi (python uygulamasını çağırır).
# exit 0 = temiz, 1 = bulgu var. CI'da veya deploy öncesi çalıştırılır.
exec python3 "$(dirname "$0")/pre-release-check.py"
