#!/bin/bash
# Test script for Future Pinball Web installer verification

set -e

RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BLUE}Future Pinball Web — Installer Verification Tests${RESET}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}\n"

# Test 1: Check installer exists
echo -e "${BLUE}Test 1: Checking installer file exists...${RESET}"
if [ -f "installer.js" ]; then
    echo -e "${GREEN}✓ installer.js found${RESET}"
else
    echo -e "${RED}✗ installer.js not found${RESET}"
    exit 1
fi

# Test 2: Check installer is executable
echo -e "\n${BLUE}Test 2: Checking installer is executable...${RESET}"
if [ -x "installer.js" ]; then
    echo -e "${GREEN}✓ installer.js is executable${RESET}"
else
    echo -e "${YELLOW}⚠ installer.js is not executable, fixing...${RESET}"
    chmod +x installer.js
    echo -e "${GREEN}✓ Made installer executable${RESET}"
fi

# Test 3: Check package.json has installer scripts
echo -e "\n${BLUE}Test 3: Checking npm scripts in package.json...${RESET}"
if grep -q '"install:setup"' package.json; then
    echo -e "${GREEN}✓ npm run install:setup script found${RESET}"
else
    echo -e "${RED}✗ npm run install:setup script missing${RESET}"
    exit 1
fi

if grep -q '"install:check"' package.json; then
    echo -e "${GREEN}✓ npm run install:check script found${RESET}"
else
    echo -e "${RED}✗ npm run install:check script missing${RESET}"
    exit 1
fi

# Test 4: Check Node.js version
echo -e "\n${BLUE}Test 4: Checking Node.js version...${RESET}"
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION detected${RESET}"

# Test 5: Check npm version
echo -e "\n${BLUE}Test 5: Checking npm version...${RESET}"
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm $NPM_VERSION detected${RESET}"

# Test 6: Check documentation files
echo -e "\n${BLUE}Test 6: Checking documentation files...${RESET}"
for doc in "INSTALLER_USAGE.md" "STARTUP_GUIDE.md" "QUICK_START.md"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ $doc found${RESET}"
    else
        echo -e "${YELLOW}⚠ $doc not found (optional)${RESET}"
    fi
done

# Test 7: Dry-run installer (check-only mode)
echo -e "\n${BLUE}Test 7: Running installer in check-only mode...${RESET}"
if node installer.js --check-only > /tmp/installer-test.log 2>&1; then
    echo -e "${GREEN}✓ Installer check-only mode completed${RESET}"
    echo -e "\n${BLUE}Installer Output:${RESET}"
    head -20 /tmp/installer-test.log
else
    echo -e "${RED}✗ Installer check-only mode failed${RESET}"
    cat /tmp/installer-test.log
    exit 1
fi

# Test 8: Verify build succeeds
echo -e "\n${BLUE}Test 8: Verifying build...${RESET}"
if npm run build > /tmp/build-test.log 2>&1; then
    BUILD_TIME=$(grep "built in" /tmp/build-test.log | tail -1)
    echo -e "${GREEN}✓ Build successful${RESET}"
    echo -e "  $BUILD_TIME"
else
    echo -e "${RED}✗ Build failed${RESET}"
    cat /tmp/build-test.log
    exit 1
fi

# Test 9: Check configuration file exists
echo -e "\n${BLUE}Test 9: Checking configuration generation...${RESET}"
if [ -f ".fpw-config.json" ]; then
    echo -e "${GREEN}✓ .fpw-config.json exists${RESET}"
    echo -e "\n${BLUE}Configuration preview:${RESET}"
    jq . .fpw-config.json 2>/dev/null | head -15 || cat .fpw-config.json | head -15
else
    echo -e "${YELLOW}⚠ .fpw-config.json not yet generated (will be created on first run)${RESET}"
fi

# Test 10: Verify start scripts
echo -e "\n${BLUE}Test 10: Checking startup scripts...${RESET}"
for script in "start-game.js" "start-game.sh"; do
    if [ -f "$script" ]; then
        echo -e "${GREEN}✓ $script found${RESET}"
    else
        echo -e "${YELLOW}⚠ $script not found${RESET}"
    fi
done

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}All verification tests passed!${RESET}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${RESET}\n"

echo -e "${BLUE}Next steps:${RESET}"
echo -e "  1. Run: ${YELLOW}npm run install:setup${RESET}"
echo -e "  2. Start: ${YELLOW}npm start${RESET}"
echo -e "  3. Play: ${YELLOW}Select a table and enjoy!${RESET}\n"

echo -e "${BLUE}For more info, see:${RESET}"
echo -e "  • INSTALLER_USAGE.md - Complete installer documentation"
echo -e "  • STARTUP_GUIDE.md - Display and startup options"
echo -e "  • QUICK_START.md - Fast setup guide\n"
