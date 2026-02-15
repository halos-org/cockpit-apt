#!/bin/bash
set -euo pipefail

# Generate debian/changelog dynamically for CI builds
# Usage: generate-changelog.sh --upstream <version> --revision <N>
# Example: generate-changelog.sh --upstream 0.2.0 --revision 2
#
# Generates a debian/changelog entry with format: <upstream>-<revision>

UPSTREAM=""
REVISION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --upstream)
            UPSTREAM="$2"
            shift 2
            ;;
        --revision)
            REVISION="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown option $1" >&2
            echo "Usage: $0 --upstream <version> --revision <N>" >&2
            exit 1
            ;;
    esac
done

if [ -z "$UPSTREAM" ] || [ -z "$REVISION" ]; then
    echo "Error: Both --upstream and --revision are required" >&2
    echo "Usage: $0 --upstream <version> --revision <N>" >&2
    exit 1
fi

# Package name
PACKAGE_NAME="cockpit-apt"

# Debian version format: upstream-revision
DEBIAN_VERSION="${UPSTREAM}-${REVISION}"

# Distribution (unstable for CI builds)
DISTRIBUTION="unstable"

# Urgency
URGENCY="medium"

# Maintainer information
MAINTAINER_NAME="${MAINTAINER_NAME:-Matti Airas}"
MAINTAINER_EMAIL="${MAINTAINER_EMAIL:-matti.airas@hatlabs.fi}"

# Date in RFC 2822 format
DATE=$(date -R)

# Get recent changes from git log
# Get commits since last published release tag
LAST_TAG=$(git tag -l "v*" --sort=-version:refname | grep -v "~pre" | head -n1 || echo "")

if [ -n "$LAST_TAG" ]; then
    CHANGES=$(git log "${LAST_TAG}"..HEAD --pretty=format:"  * %s" --no-merges || echo "  * Build ${REVISION}")
else
    # No previous tags, use recent commits
    CHANGES=$(git log -10 --pretty=format:"  * %s" --no-merges || echo "  * Build ${REVISION}")
fi

# If no changes (shouldn't happen), use a default message
if [ -z "$CHANGES" ]; then
    CHANGES="  * Build ${REVISION}"
fi

# Generate debian/changelog entry
cat > debian/changelog <<EOF
${PACKAGE_NAME} (${DEBIAN_VERSION}) ${DISTRIBUTION}; urgency=${URGENCY}

${CHANGES}

 -- ${MAINTAINER_NAME} <${MAINTAINER_EMAIL}>  ${DATE}
EOF

echo "Generated debian/changelog:"
echo "  Version: ${DEBIAN_VERSION}"
echo "  Distribution: ${DISTRIBUTION}"
cat debian/changelog
