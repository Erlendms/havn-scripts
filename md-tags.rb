#!/usr/bin/env ruby
# encoding: UTF-8
require 'shellwords'
require 'find'

# This delay is there to increase reliability when used with Hazel.
sleep 5

# Specify the file extensions
file_extensions = ["*.md", "*.txt", "*.ulysses"] # Add or change extensions as needed
search_directory = Dir.pwd # Or set a specific directory

# Regex patterns to include #multi word tags#.
multi_word_tag_pattern = /#([^\s#][^#\n\r]*)(?=#\s|#$)/
single_word_tag_pattern = /(?<!#)#(\p{L}+)(?=\s|$)/

# Recursively traverse directories
Find.find(search_directory) do |path|
		# Skip directories that start with '@'
		if File.directory?(path)
				if File.basename(path).start_with?('@')
						Find.prune
				else
						next
				end
		end

		# Process files with the specified extensions
		if file_extensions.any? { |ext| File.fnmatch(ext, File.basename(path)) }
				next unless File.file?(path) # Skip directories just in case

				combined_tags = []

				File.open(path, "r:UTF-8") do |file|
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
						filename_escaped = Shellwords.escape(File.expand_path(path)) # Safely escape filename

						# Apply tags to the file using macOS `xattr` command
						system("xattr -w com.apple.metadata:_kMDItemUserTags '#{plist_escaped}' #{filename_escaped}")
				end
		end
end

0
