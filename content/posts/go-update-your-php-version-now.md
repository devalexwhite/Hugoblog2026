{
  "title": "Go update your PHP version now!",
  "date": "2026-10-21T21:15:00-04:00",
  "url": "/go-update-your-php-version-now/",
  "tags": [
    "Linux",
    "Development"
  ],
  "description": "If you're running a blog that is built on PHP (for example, Pure Blog), you need to update your PHP installation right now. Critical vulnerabilities have been discovered in PHP, putting any PHP application at risk.",
  "cover": "",
  "comments": true,
  "source": "https://thatalexguy.dev/go-update-your-php-version-now"
}

If you're running a blog that is built on PHP (for example, Pure Blog), you _need_ to update your PHP installation right now. [Critical vulnerabilities](https://www.nsa.gov/Press-Room/Press-Releases-Statements/Press-Release-View/Article/4630238/nsa-advisory-critical-patches-recommended-for-php-vulnerabilities/) have been discovered in PHP, putting any PHP application at risk.

So SSH into your server, run `sudo apt update && sudo apt upgrade && sudo reboot now` and then run `php -v` to ensure you are now running one of the patched versions ([8.5.12, 8.4.27, 8.3.36 and 8.2.35](https://www.php.net/index.php#2026-10-21-5)).

Don't delay, act today!
