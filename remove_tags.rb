#!/usr/bin/env ruby
# encoding: UTF-8
require 'shellwords'

# Search directory, include all files
search_directory = Dir.pwd # Or set to a specific directory
search_pattern = File.join(search_directory, "**", "*") # Match all files in all directories and subdirectories

Dir.glob(search_pattern).each do |filename|
	next unless File.file?(filename) # Skip directories

	filename_escaped = Shellwords.escape(File.expand_path(filename)) # Safely escape filename

	# Remove tags from the file using macOS `xattr` command
	system("xattr -d com.apple.metadata:_kMDItemUserTags #{filename_escaped} 2>/dev/null")
end
