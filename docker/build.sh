#!/bin/bash
# Build AABs for FocusForge and NoiseLog on TrueNAS
# Usage: ./build.sh [focusforge|noiselog|all]

set -e
APP=${1:-all}
BASE=/mnt/MainPool/Media/apps
KEYSTORE=$BASE/orthogonal-release.keystore
OUTPUT=$BASE/aab-output

mkdir -p $OUTPUT

build_app() {
  local name=$1
  local src=$BASE/${name}-src
  echo ""
  echo "============================================"
  echo "  Building $name AAB"
  echo "============================================"

  # Run build in Docker container
  docker run --rm \
    -v "$src:/app" \
    -v "$KEYSTORE:/keystore/release.keystore:ro" \
    -v "$OUTPUT:/output" \
    -v "$BASE/gradle-cache:/root/.gradle" \
    android-builder:latest \
    bash -c "
      cd /app
      npm install --quiet 2>/dev/null
      
      # Set signing config
      cat > android/gradle.properties << 'EOF'
android.useAndroidX=true
android.enableJetifier=false
newArchEnabled=true
hermesEnabled=true
MYAPP_UPLOAD_STORE_FILE=/keystore/release.keystore
MYAPP_UPLOAD_KEY_ALIAS=orthogonal
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEYSTORE_PASSWORD
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.parallel=false
EOF
      
      cd android
      chmod +x gradlew
      ./gradlew app:bundleRelease -x lint -x test 2>&1 | tail -5
      
      if [ -f app/build/outputs/bundle/release/app-release.aab ]; then
        cp app/build/outputs/bundle/release/app-release.aab /output/${name}-release.aab
        echo '✅ ${name} AAB built successfully'
        ls -lh /output/${name}-release.aab
      else
        echo '❌ ${name} AAB build failed'
        exit 1
      fi
    "
}

# Build Docker image if not exists
echo "=== Building Docker image ==="
cd $BASE/android-builder
docker build -t android-builder:latest . 2>&1 | tail -5

if [ "$APP" = "all" ] || [ "$APP" = "focusforge" ]; then
  build_app focusforge
fi

if [ "$APP" = "all" ] || [ "$APP" = "noiselog" ]; then
  build_app noiselog
fi

echo ""
echo "=== Results ==="
ls -lh $OUTPUT/*.aab 2>/dev/null || echo "No AABs found"
