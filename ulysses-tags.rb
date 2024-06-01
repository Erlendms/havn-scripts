#!/usr/bin/env ruby
# encoding: UTF-8
require 'shellwords'

# Specify the directories or file types if needed
file_extensions = ["*.md", "*.txt", "*.ulysses"] # Add or change extensions as per Ulysses files
search_directory = Dir.pwd # Or set a specific directory
search_pattern = File.join(search_directory, "**", "{#{file_extensions.join(',')}}") # Prepares the glob pattern

# Regex patterns for multi-word and single-word tags
multi_word_tag_pattern = /#([^\s#][^#\n\r]*)(?=#\s|#$)/
single_word_tag_pattern = /#(\w+)(?=$|\s#)/

Dir.glob(search_pattern).each do |filename|
  next unless File.file?(filename) # Skip directories

  tags = []

  File.open(filename, "r:UTF-8") do |file|
    last_line = file.readlines[-1] # Reads all lines into an array and accesses the last one
    if last_line && last_line.strip.start_with?("#")
      # Capture multi-word tags
      multi_word_tags = last_line.scan(multi_word_tag_pattern).flatten.map { |tag| tag.encode("UTF-8") }
      # Capture single-word tags
      single_word_tags = last_line.scan(single_word_tag_pattern).flatten.map { |tag| tag.encode("UTF-8") }
      
      # Combine and remove duplicates
      tags = (multi_word_tags + single_word_tags).uniq
    end
  end

  unless tags.empty?
    # Construct the plist string to use for the `xattr` command
    plist_tags = tags.map { |tag| "<string>#{tag}</string>" }.join
    plist = %Q{<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array>#{plist_tags}</array></plist>}
    plist_escaped = plist.gsub("'", "'\\\\''") # Safely escapes the plist content for shell command
    filename_escaped = Shellwords.escape(File.expand_path(filename)) # Safely escapes filename

    # Apply tags to the file using macOS `xattr` command
    system("xattr -w com.apple.metadata:_kMDItemUserTags '#{plist_escaped}' #{filename_escaped}")
    puts "Applied tags to #{filename}"
  end
end
