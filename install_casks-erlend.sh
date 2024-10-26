#!/bin/zsh

# Array to keep track of failed installations
failed_casks=()
failed_mas_apps=()

# List of casks to install
casks=(
	# applite
	affinity-designer
	affinity-photo
	affinity-publisher
	bbedit
	bike
	calibre
	daisydisk
	discord
	# dropbox@beta
	fmail2
	hazel
	karabiner-elements
	keyboard-maestro
	lasso
	linearmouse
	memory-clean-3
	menuwhere
	messenger
	nova
	obsidian
	pearcleaner
	# qmk-toolbox
	raycast
	setapp
	slack
	soundsource
	squash
	steam
	telegram
	tidal
	transmit
	vivaldi
	# warp
)

# List of Mac App Store apps to install (use app IDs)
mas_apps=(
	1569813296	# 1Password for Safari
	1593408455	# Anybox
	1198176727	# ControllerForHomeKit
	899247664		# TestFlight
	950297057		# FuzzyTime
	1622835804	# Kagi for Safari
	409183694		# Keynote
	1482527526	# Lire
	634148309		# Logic Pro
	1589391989	# Mapper
	462058435		# Microsoft Excel
	462062816		# Microsoft PowerPoint
	462054704		# Microsoft Word
	1659154653	# Mona
	409203825		# Numbers
	409201541		# Pages
	1143513744	# Paper
	6449873635	# Sink It for Reddit
	1573461917	# SponsorBlock
	6471380298	# StopTheMadness Pro
	1568262835	# Super Agent
	1600520682	# Text Workflow
	1491071483	# Tot
	1320666476	# Wipr
	
)

# Install Cork
echo "Tapping marsanne/cask for Cork..."
if ! brew tap marsanne/cask; then
	echo "Failed to tap marsanne/cask."
	failed_casks+=("Cork Tap")
else
	echo "Installing Cork..."
	if ! brew install --cask cork; then
		echo "Failed to install Cork."
		failed_casks+=("Cork")
	fi
fi

# Loop through each cask and attempt to install it
for cask in $casks; do
	echo "Installing $cask..."
	if ! brew install --cask $cask; then
		echo "Failed to install $cask."
		failed_casks+=($cask)
	fi
done

# Install Mac App Store apps
for app_id in $mas_apps; do
	echo "Installing app with ID $app_id..."
	if ! mas install $app_id; then
		echo "Failed to install app with ID $app_id."
		failed_mas_apps+=($app_id)
	fi
done

# Check if there were any failures
if [ ${#failed_casks[@]} -ne 0 ]; then
	echo "The following casks failed to install:"
	for failed_cask in $failed_casks; do
		echo "- $failed_cask"
	done
else
	echo "All casks installed successfully."
fi

if [ ${#failed_mas_apps[@]} -ne 0 ]; then
	echo "The following Mac App Store apps failed to install:"
	for failed_app in $failed_mas_apps; do
		echo "- $failed_app"
	done
else
	echo "All Mac App Store apps installed successfully."
fi