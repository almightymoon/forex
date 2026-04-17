#!/usr/bin/env bash
set -euo pipefail

# Restore a backup created by backup-all.sh
#
# Usage:
#   ./scripts/restore-all.sh /path/to/forex-backup-*.tar.gz[.enc]
#
# Required:
# - mongorestore in PATH
# - MONGO_URI or MONGODB_URI set in environment (target DB)
#
# Optional:
# - BACKUP_ENCRYPTION_PASSPHRASE (required if restoring an .enc backup)

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_cmd mongorestore
need_cmd tar
need_cmd gzip

archive_path="${1:-}"
if [[ -z "${archive_path}" ]]; then
  echo "Usage: $0 /path/to/forex-backup-*.tar.gz[.enc]" >&2
  exit 1
fi
if [[ ! -f "${archive_path}" ]]; then
  echo "Backup file not found: ${archive_path}" >&2
  exit 1
fi

MONGO_URI="${MONGO_URI:-${MONGODB_URI:-}}"
if [[ -z "${MONGO_URI}" ]]; then
  echo "Missing MONGO_URI/MONGODB_URI. Export it before running restore." >&2
  exit 1
fi

workdir="$(mktemp -d)"
cleanup() { rm -rf "${workdir}"; }
trap cleanup EXIT

input="${archive_path}"
if [[ "${archive_path}" == *.enc ]]; then
  need_cmd openssl
  pass="${BACKUP_ENCRYPTION_PASSPHRASE:-}"
  if [[ -z "${pass}" ]]; then
    echo "This backup is encrypted. Set BACKUP_ENCRYPTION_PASSPHRASE to restore." >&2
    exit 1
  fi
  dec_path="${workdir}/bundle.tar.gz"
  openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:${pass}" -in "${archive_path}" -out "${dec_path}"
  input="${dec_path}"
fi

echo "Extracting bundle..."
tar -xzf "${input}" -C "${workdir}"

mongo_archive="$(ls -1 "${workdir}"/*.mongo.archive.gz 2>/dev/null || true)"
if [[ -z "${mongo_archive}" ]]; then
  echo "Could not find Mongo archive in bundle." >&2
  exit 1
fi

echo "Restoring MongoDB from archive..."
mongorestore --uri="${MONGO_URI}" --archive="${mongo_archive}" --gzip --drop

extras="$(ls -1 "${workdir}"/*.extras.tar.gz 2>/dev/null || true)"
if [[ -n "${extras}" ]]; then
  echo "Extracting extra paths archive..."
  # Extract to root (because backup used -P to preserve absolute paths)
  sudo tar -xzf "${extras}" -C /
  echo "Extra paths restored."
fi

echo "Restore complete."
