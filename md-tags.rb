#!/usr/bin/env ruby
# encoding: UTF-8
require 'shellwords'

# This delay is there to increase reliability when used with Hazel.
sleep 5

# Specify the directories or file types
file_extensions = ["*.md", "*.txt", "*.ulysses"] # Add or change extensions as needed
search_directory = Dir.pwd # Or set a specific directory
search_pattern = File.join(search_directory, "**", "{#{file_extensions.join(',')}}") # Prepares the glob pattern

# Regex patterns to prevent multi-line captures
multi_word_tag_pattern = /#([^\s#][^#\n\r]*)(?=#\s|#$)/
single_word_tag_pattern = /#(\w+)(?=$|\s#)/

Dir.glob(search_pattern).each do |filename|
	next unless File.file?(filename) # Skip directories

	combined_tags = []

	File.open(filename, "r:UTF-8") do |file|
		content = file.read

		# Capture multi-word and single-word tags
		multi_word_tags = content.scan(multi_word_tag_pattern).flatten.map { |tag| tag.strip }
		single_word_tags = content.scan(single_word_tag_pattern).flatten.map { |tag| tag.strip }

		# Combine tags before removing duplicates
		combined_tags = multi_word_tags + single_word_tags
	end

	# Use a hash to remove case-insensitive duplicates while preserving the original case
	unique_tags = combined_tags.each_with_object({}) { |tag, hash| hash[tag.downcase] ||= tag }.values

	unless unique_tags.empty?
		plist_tags = unique_tags.map { |tag| "<string>#{tag}</string>" }.join
		plist = %Q{<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array>#{plist_tags}</array></plist>}
		plist_escaped = plist.gsub("'", "'\\\\''") # Safely escape the plist content for the shell command
		filename_escaped = Shellwords.escape(File.expand_path(filename)) # Safely escape filename

		# Apply tags to the file using macOS `xattr` command
		system("xattr -w com.apple.metadata:_kMDItemUserTags '#{plist_escaped}' #{filename_escaped}")
	end
end
