#!/usr/bin/env bash
set -euo pipefail

# Backup Forex Navigators data (MongoDB + optional directories).
#
# What it backs up:
# - MongoDB database (users, commissions, payments, etc.)
# - Optional extra paths (server logs, local uploads, etc.)
#
# Where it stores:
# - Local backup directory (default: ./backups)
# - Optional S3 upload if configured
#
# Required:
# - mongodump in PATH
# - MONGO_URI or MONGODB_URI set in environment (or passed inline)
#
# Optional:
# - BACKUP_DIR (default: ./backups)
# - BACKUP_KEEP_DAYS (default: 30)
# - BACKUP_EXTRA_PATHS (colon-separated list of absolute/relative paths to include)
# - BACKUP_ENCRYPTION_PASSPHRASE (if set, encrypt output using openssl)
# - BACKUP_S3_URI (e.g. s3://my-bucket/forex-backups) + AWS CLI configured

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_cmd mongodump
need_cmd tar
need_cmd gzip

MONGO_URI="${MONGO_URI:-${MONGODB_URI:-}}"
if [[ -z "${MONGO_URI}" ]]; then
  echo "Missing MONGO_URI/MONGODB_URI. Export it before running backup." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
BACKUP_EXTRA_PATHS="${BACKUP_EXTRA_PATHS:-}"
BACKUP_S3_URI="${BACKUP_S3_URI:-}"
BACKUP_ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_PASSPHRASE:-}"

mkdir -p "${BACKUP_DIR}"

ts="$(date -u +'%Y%m%dT%H%M%SZ')"
base="forex-backup-${ts}"
workdir="$(mktemp -d)"
cleanup() { rm -rf "${workdir}"; }
trap cleanup EXIT

manifest="${workdir}/MANIFEST.txt"
{
  echo "created_at_utc=${ts}"
  echo "mongo_uri=${MONGO_URI%%\?*}" # strip query params
  echo "hostname=$(hostname)"
  echo "extra_paths=${BACKUP_EXTRA_PATHS}"
} > "${manifest}"

db_archive="${workdir}/${base}.mongo.archive.gz"
echo "Creating MongoDB dump..."
mongodump --uri="${MONGO_URI}" --archive --gzip > "${db_archive}"

extras_tar="${workdir}/${base}.extras.tar.gz"
extras_included="false"
if [[ -n "${BACKUP_EXTRA_PATHS}" ]]; then
  IFS=':' read -r -a paths <<< "${BACKUP_EXTRA_PATHS}"
  include_args=()
  for p in "${paths[@]}"; do
    [[ -z "${p}" ]] && continue
    if [[ -e "${p}" ]]; then
      include_args+=("${p}")
    else
      echo "WARN: extra path not found, skipping: ${p}" >&2
    fi
  done

  if [[ "${#include_args[@]}" -gt 0 ]]; then
    echo "Archiving extra paths..."
    # Use -P to preserve absolute paths if provided
    tar -czPf "${extras_tar}" "${include_args[@]}"
    extras_included="true"
  fi
fi

bundle="${BACKUP_DIR}/${base}.tar"
echo "Bundling backup artifacts..."
tar -cf "${bundle}" -C "${workdir}" "$(basename "${db_archive}")" "$(basename "${manifest}")"
if [[ "${extras_included}" == "true" ]]; then
  tar -rf "${bundle}" -C "${workdir}" "$(basename "${extras_tar}")"
fi
gzip -f "${bundle}"
bundle="${bundle}.gz"

final_path="${bundle}"
if [[ -n "${BACKUP_ENCRYPTION_PASSPHRASE}" ]]; then
  need_cmd openssl
  echo "Encrypting backup bundle..."
  enc_path="${bundle}.enc"
  # AES-256-CBC with PBKDF2 (sane default for passphrase encryption)
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:${BACKUP_ENCRYPTION_PASSPHRASE}" -in "${bundle}" -out "${enc_path}"
  rm -f "${bundle}"
  final_path="${enc_path}"
fi

echo "Backup created: ${final_path}"

if [[ -n "${BACKUP_S3_URI}" ]]; then
  need_cmd aws
  echo "Uploading to S3..."
  aws s3 cp "${final_path}" "${BACKUP_S3_URI%/}/"
  echo "Uploaded to: ${BACKUP_S3_URI%/}/$(basename "${final_path}")"
fi

echo "Applying retention (keep ${BACKUP_KEEP_DAYS} days)..."
python3 - <<'PY' "${BACKUP_DIR}" "${BACKUP_KEEP_DAYS}"
import os, sys, time
backup_dir = sys.argv[1]
keep_days = int(sys.argv[2])
cutoff = time.time() - keep_days * 86400

for name in os.listdir(backup_dir):
    if not name.startswith("forex-backup-"):
        continue
    path = os.path.join(backup_dir, name)
    try:
        st = os.stat(path)
    except FileNotFoundError:
        continue
    if st.st_mtime < cutoff:
        try:
            os.remove(path)
        except Exception:
            pass
PY

echo "Done."
