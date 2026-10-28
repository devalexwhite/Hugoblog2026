#!/usr/bin/env bash
set -euo pipefail

# Match the tested local version instead of Vercel's legacy Hugo binary.
BLOG_HUGO_VERSION=0.168.0
blog_build_tools=$(mktemp -d)
trap 'rm -rf "$blog_build_tools"' EXIT

curl --fail --silent --show-error --location --retry 3 \
  "https://github.com/gohugoio/hugo/releases/download/v${BLOG_HUGO_VERSION}/hugo_${BLOG_HUGO_VERSION}_linux-amd64.tar.gz" \
  --output "$blog_build_tools/hugo.tar.gz"
tar -xzf "$blog_build_tools/hugo.tar.gz" -C "$blog_build_tools" hugo

"$blog_build_tools/hugo" version
"$blog_build_tools/hugo" --config hugo.toml --gc --minify --panicOnWarning
node scripts/audit.cjs
