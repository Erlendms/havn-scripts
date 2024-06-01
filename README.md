# havn-scripts
Here are some scripts I'm using!
The ones who's here at the moment are meant to read Markdown and [Bike](https://www.hogbaysoftware.com/bike/) files, and then add native Finder/Files tags. [Here's a blog post](https://havn.blog/2024/06/01/some-scripts-for.html) with some details.
* **_front\_matter-tags.rb_**: This only is meant to only capture tags added in the front matter. It looks for the first line that starts with "tags:", and then it adds the `#tags` in `#that line#`. This one also works in Bike documents!
* **_ulysses-keywords.rb_**_: When you add a keyword in Ulysses, it simply adds them as hashtags on the last line of the document. This script adds them, and just them, as native tags._
* **_md-tags.rb_**: This scans the entire file and adds every tag!