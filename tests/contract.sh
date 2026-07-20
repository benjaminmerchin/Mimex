#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
VIDEO_URL="${VIDEO_URL:-https://mimex.netlify.app/samples/demo-linkedin-new.mp4}"
AUTH_TOKEN="${AUTH_TOKEN:-contract-test-token-0001}"
POLL_TIMEOUT_SECONDS="${POLL_TIMEOUT_SECONDS:-600}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-3}"

for command in curl jq; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: required command not found: $command" >&2
    exit 1
  fi
done

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

request_number=0
response_status=""
response_body=""
response_headers=""

request() {
  request_number=$((request_number + 1))
  response_body="$tmp_dir/body-$request_number"
  response_headers="$tmp_dir/headers-$request_number"
  response_status="$(curl --silent --show-error \
    --output "$response_body" \
    --dump-header "$response_headers" \
    --write-out '%{http_code}' \
    "$@")"
}

fail() {
  echo "not ok - $1" >&2
  if [[ -n "${response_status:-}" ]]; then
    echo "HTTP $response_status" >&2
  fi
  if [[ -n "${response_body:-}" && -f "$response_body" ]]; then
    jq . "$response_body" 2>/dev/null || sed -n '1,80p' "$response_body" >&2
  fi
  exit 1
}

expect_status() {
  local expected="$1"
  local label="$2"
  [[ "$response_status" == "$expected" ]] || fail "$label: expected HTTP $expected"
  echo "ok - $label"
}

expect_json() {
  local expression="$1"
  local label="$2"
  shift 2
  jq -e "$@" "$expression" "$response_body" >/dev/null || fail "$label"
}

json_header=(-H "content-type: application/json")
auth_header=(-H "authorization: Bearer $AUTH_TOKEN")
test_suffix="$(date +%s)-$$-$RANDOM"
idempotency_key="mimex-contract-$test_suffix"
short_key="short"
long_key="$(printf 'x%.0s' {1..201})"
flat_body="$(jq -cn --arg video_url "$VIDEO_URL" '{video_url: $video_url}')"
wrapped_body="$(jq -cn --arg video_url "$VIDEO_URL" '{input: {video_url: $video_url}}')"
different_body="$(jq -cn --arg video_url "${VIDEO_URL}?contract=different-$test_suffix" '{video_url: $video_url}')"

echo "Testing Ginse v3 provider contract at $BASE_URL"

request -X POST "$BASE_URL/run" "${json_header[@]}" --data "$flat_body"
expect_status 401 "POST /run rejects a missing bearer token"
expect_json '.error == "missing_or_invalid_token"' "unauthorized response has the expected error"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" --data "$flat_body"
expect_status 400 "POST /run rejects a missing idempotency key"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: $short_key" --data "$flat_body"
expect_status 400 "POST /run rejects an idempotency key shorter than 8 characters"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: $long_key" --data "$flat_body"
expect_status 400 "POST /run rejects an idempotency key longer than 200 characters"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: invalid-$test_suffix" --data '{"video_url":"http://example.com/video.mp4"}'
expect_status 422 "POST /run rejects input outside the schema"
expect_json '.error == "input_schema_violation"' "invalid input response has the expected error"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: $idempotency_key" --data "$flat_body"
expect_status 202 "first valid flat request is accepted"
expect_json '.status == "pending" and .replayed == false and
  (.provider_operation_id | type == "string" and length > 0) and
  (.status_url | type == "string" and length > 0)' \
  "first valid response has the pending operation shape"
operation_id="$(jq -r '.provider_operation_id' "$response_body")"
status_url="$(jq -r '.status_url' "$response_body")"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: $idempotency_key" --data "$wrapped_body"
expect_json '.provider_operation_id == $operation_id and .replayed == true' \
  "wrapped replay returns the same operation with replayed=true" \
  --arg operation_id "$operation_id"
if [[ "$response_status" != "202" && "$response_status" != "200" ]]; then
  fail "wrapped replay: expected HTTP 202 while pending or 200 if already terminal"
fi
echo "ok - wrapped input is accepted and replay is idempotent (HTTP $response_status)"

request -X POST "$BASE_URL/run" "${json_header[@]}" "${auth_header[@]}" \
  -H "idempotency-key: $idempotency_key" --data "$different_body"
expect_status 409 "same idempotency key with a different body is rejected"
expect_json '.error == "idempotency_key_reused_with_different_request"' \
  "idempotency conflict response has the expected error"

request "$status_url"
if [[ "$response_status" == "202" ]]; then
  expect_json '.status == "pending" and .provider_operation_id == $operation_id and
    (.status_url | type == "string" and length > 0)' \
    "pending status response has the Ginse shape" \
    --arg operation_id "$operation_id"
  echo "ok - GET /status/:id returns HTTP 202 while pending"
elif [[ "$response_status" == "200" ]]; then
  echo "ok - operation completed before the pending status observation"
else
  fail "GET /status/:id: expected HTTP 202 or 200"
fi

deadline=$((SECONDS + POLL_TIMEOUT_SECONDS))
while [[ "$response_status" == "202" && "$SECONDS" -lt "$deadline" ]]; do
  sleep "$POLL_INTERVAL_SECONDS"
  request "$status_url"
done

[[ "$response_status" == "200" ]] || fail "operation did not reach a terminal state within ${POLL_TIMEOUT_SECONDS}s"
expect_json '.provider_operation_id == $operation_id and
  ((.status == "succeeded" and
    (.output.skill_name | type == "string" and length > 0) and
    (.output.description | type == "string" and length > 0) and
    (.output.skill_md | type == "string" and length > 0) and
    (.output.download_url | type == "string" and length > 0)) or
   (.status == "failed" and (.error | type == "string" and length > 0)))' \
  "terminal status response has output or error" \
  --arg operation_id "$operation_id"

terminal_status="$(jq -r '.status' "$response_body")"
if [[ "$terminal_status" != "succeeded" ]]; then
  fail "reference operation failed; cannot verify the SKILL.md download"
fi
echo "ok - terminal success returns HTTP 200 with the complete output"

download_url="$(jq -r '.output.download_url' "$response_body")"
request "$download_url"
expect_status 200 "generated SKILL.md downloads successfully"

content_type="$(awk -F ': *' 'tolower($1) == "content-type" {gsub(/\r/, "", $2); print tolower($2)}' "$response_headers" | tail -n 1)"
content_disposition="$(awk -F ': *' 'tolower($1) == "content-disposition" {gsub(/\r/, "", $2); print tolower($2)}' "$response_headers" | tail -n 1)"
[[ "$content_type" == text/markdown* ]] || fail "SKILL.md response must use text/markdown"
[[ "$content_disposition" == attachment* ]] || fail "SKILL.md response must be an attachment"
grep -q '^---$' "$response_body" || fail "downloaded SKILL.md must contain frontmatter delimiters"
echo "ok - SKILL.md response has markdown attachment headers and content"

echo "Ginse v3 provider contract passed for operation $operation_id"
