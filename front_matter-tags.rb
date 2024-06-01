#!/usr/bin/env ruby
# encoding: UTF-8
require 'nokogiri'
require 'shellwords'

# This delay is there to increase reliability when used with Hazel.
sleep 5

def extract_tags_from_line(line)
  if line.strip =~ /^tags:\s*(.*)/i
    tags_portion = line.strip[/^tags:\s*(.*)/i, 1]
    return tags_portion.split(" ").map { |t| t.strip.delete_prefix("#").encode("UTF-8") } if tags_portion
  end
  []
end

Dir.glob(["**/*.md", "**/*.txt", "**/*.bike"]).each do |filename|
  tags = []

  case File.extname(filename)
  when '.md', '.txt'
    File.open(filename, "r:UTF-8") do |file|
      file.each_line do |line|
        tags += extract_tags_from_line(line)
        break unless tags.empty? # Exit the loop after finding the tag line
      end
    end
  when '.bike'
    doc = Nokogiri::HTML(File.read(filename))
    tagline_element = doc.at_css('body ul li p')
    if tagline_element
      tagline = tagline_element.text.strip
      tags += extract_tags_from_line(tagline)
    end
  end

  # Use a hash to remove case-insensitive duplicates while preserving the original case
  unique_tags = tags.each_with_object({}) { |tag, hash| hash[tag.downcase] ||= tag }.values

  unless unique_tags.empty?
    # Direct UTF-8 encoding and plist generation
    plist_tags = unique_tags.map { |tag| "<string>#{tag}</string>" }.join
    plist = %Q{<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array>#{plist_tags}</array></plist>}
    
    # Safe escape of plist and file path for xattr command
    plist_escaped = plist.gsub("'", "'\\\\''")
    filename_escaped = Shellwords.escape(File.expand_path(filename))

    # Apply tags to the file using macOS `xattr` command
    system("xattr -w com.apple.metadata:_kMDItemUserTags '#{plist_escaped}' #{filename_escaped}")
  end
end
