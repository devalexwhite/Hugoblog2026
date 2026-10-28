{
  "title": "Self-Hosting",
  "date": "2026-09-21T14:10:00-04:00",
  "url": "/self-hosting/",
  "tags": [
    "SelfHosting"
  ],
  "description": "I got bit by the self-hosting bug this weekend, and boy it's been fun! You see, I've had a Synology DS923+ and HP Victus 15L that have been sitting around gathering dust in the basement. In a desire to stop spending subscription fees to App",
  "cover": "/content/images/self-hosting/PXL_20260920_015101191.jpg",
  "comments": true,
  "source": "https://thatalexguy.dev/self-hosting"
}

I got bit by the self-hosting bug this weekend, and boy it's been fun! You see, I've had a Synology DS923+ and HP Victus 15L that have been sitting around gathering dust in the basement. In a desire to stop spending subscription fees to Apple and Google for photo storage, I decided to move the machines to my upstairs office and put them to use.

I added a new router to direct connect the HP and Synology with my laptop dock. From there, I imaged the HP with Ubuntu Server and got it setup with Dockge. I mounted the Synology via NFS so I have direct access to it's storage on the HP.

![PXL\_20260920\_015101191](/content/images/self-hosting/PXL_20260920_015101191.jpg) _My new "server rack"_

So far I've installed two services that I absolutely love. First is a Google Photos alternative called [Immich](https://immich.app/). It supports local facial detection, mobile backup and features a really nice app available on F-Droid. I can create public share links, organize into albums and view photos I've taken on a map.

![immich\_mobile](/content/images/self-hosting/immich_mobile.png) _The Immich app is so good_

Second, I installed [Memos](https://usememos.com/), basically a personal Twitter feed to dump thoughts, notes, images and tasks. I built a dead simple CLI app that connects via the API so I can just run `memoscli "Remember Dockge runs on port 5001"`. You can organize by tags, separate spaces and tasks. You can even post publicly to turn it into a microblog of sorts (which I very well might do).

Both of these services are behind a Caddy reverse proxy. I forwarded HTTP(S) ports through my UniFi Dream Machine to the HP and added subdomains to `thatalexguy.dev` to support the services. Caddy takes care of SSL certs automatically!

I'll probably add Jellyfin in the near future, especially since the HP is rocking a pretty decent graphics card for transcoding media. I'll likely move this blog off of my DigitalOcean VPS onto the HP as well to save a few extra bucks every month.

If anyone has additional suggestions on services I should install, let me know!
