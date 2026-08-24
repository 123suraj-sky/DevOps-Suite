#!/usr/bin/env bash
# =============================================================================
# install-service.sh — One-time setup script to register DevOps Suite as a
# systemd service on the Azure VM.
#
# Run this ONCE after cloning the repo on the VM:
#   bash scripts/install-service.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/devopssuite.service"
UNIT_DEST="/etc/systemd/system/devopssuite.service"

echo "========================================="
echo "  DevOps Suite — systemd service install"
echo "========================================="

# 1. Copy the unit file into systemd
echo "[1/4] Copying unit file to $UNIT_DEST..."
sudo cp "$SERVICE_FILE" "$UNIT_DEST"
sudo chmod 644 "$UNIT_DEST"

# 2. Reload systemd so it picks up the new unit
echo "[2/4] Reloading systemd daemon..."
sudo systemctl daemon-reload

# 3. Enable the service so it starts automatically on every reboot
echo "[3/4] Enabling service (auto-start on reboot)..."
sudo systemctl enable devopssuite

# 4. Start it right now
echo "[4/4] Starting service..."
sudo systemctl start devopssuite

echo ""
echo "✅ Done! Service is installed and running."
echo ""
echo "Useful commands:"
echo "  sudo systemctl status devopssuite     # check current status"
echo "  sudo systemctl restart devopssuite    # restart all containers"
echo "  sudo systemctl stop devopssuite       # stop all containers"
echo "  sudo journalctl -u devopssuite -f     # tail service logs"
