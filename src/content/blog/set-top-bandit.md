---
title: "Set-Top Bandit"
description: "A funny take on the day's tech news: Google says over a million Android TV boxes came with a factory-installed crime subscription."
pubDate: 2026-11-03
---

*The speech below is satire. The events it riffs on are real and listed with sources at the bottom. The jokes are jokes - no quotes were invented, and the accusations are Google's, attributed where they appear.*

One story today: Google has dismantled a botnet of more than 1.3 million Android TV boxes that were apparently born this way. Facts from Google's threat report, BleepingComputer and Trend Micro; the tiny ski masks are mine.

![A worried cartoon elephant in a hoodie on a couch, staring at a small TV streaming box wearing a tiny ski mask, with three more masked boxes lined up behind it](/blog/set-top-bandit-hero.webp)

*Illustration generated for this post. The elephant is fine. The box insists it is also fine.*

Google has just shut down a crime ring of more than 1.3 million Android TV boxes across 200 countries, and the twist is that none of the boxes knew they were in a gang, because they are boxes. Google's investigators say the malware was not caught from the internet - it came with the box, baked into the firmware at the factory - and Google assesses, with high confidence, that the manufacturer put it there on purpose. You did not get a virus. You bought one. It was in the box. The box was the virus.

The business model, as Google tells it, is genuinely impressive in the worst way. Videostrong did not just sell you a streaming box; according to Google's report, it rented your box to criminal affiliates, who used it to click ads, resell your internet connection to strangers, and install more malware, like a flatmate who sublets your sofa while you sleep. And if you somehow found the malware and deleted it, it reinstalled itself from a hidden partition the moment you rebooted, which is less a flatmate and more a horror film.

My favourite detail is the accomplice list. The takedown also cut off at least 10 million other compromised devices, including - and I need you to be sitting down for this - karaoke machines and telehealth hardware. Somewhere out there is a karaoke machine with a criminal record. Somewhere there is a device whose entire job is checking on your gran, quietly clicking banner ads for strangers.

To be fair to everyone except the box people: Google did the right things in the end - legal action, takedowns, a permanent ban from the certified-Android club, and Japan's National Police Agency on the group chat. The only awkward part is that the bad code slipped through Google's own security tests by loading itself after first boot, meaning the world's most thorough device-certification process was defeated by a box that waited until you were not looking. Anyway. If your TV box cost $35 and came with all the channels free forever, I have some news about how it paid for the channels.

That's today: over a million TV boxes were living a double life, Google says the factory was in on it, and the karaoke machines saw everything. The facts are Google's, BleepingComputer's and Trend Micro's; the tiny ski masks are mine. Sources checked the morning of 3 Nov.

## The facts behind the jokes

Google's Threat Intelligence Group says it and industry partners dismantled the XCPE botnet last week: more than 1.3 million Android TV set-top boxes across 200 countries, enrolled by a backdoor built into the firmware at the factory, which Google assesses "with high confidence" was intentionally developed and operated for profit by the manufacturer, Videostrong Technology Co.; Google has cut ties with the company and banned it and future affiliates from building certified Android devices ([Google Cloud](https://cloud.google.com/blog/topics/threat-intelligence/shutting-the-door-on-the-xcpe-botnet); [Trend Micro](https://newsroom.trendmicro.com/2026-11-02-Industry-Takedown-of-Botnet-Hidden-in-More-Than-1-3-Million-TV-Set-Top-Boxes-across-200-Countries)). According to Google's report, Videostrong sold backdoor access to criminal affiliates, whose modules ran ad fraud, quietly enrolled the boxes into residential proxy networks and installed more malware; the backdoor ran with Android system privileges, could disable Play Protect, capture screenshots and inject keystrokes, and reinstalled itself from a hidden /oem/ partition on reboot, evolving across many device brands and models since at least late 2024 ([Google Cloud](https://cloud.google.com/blog/topics/threat-intelligence/shutting-the-door-on-the-xcpe-botnet); [BleepingComputer](https://www.bleepingcomputer.com/news/security/google-disrupts-million-device-xcpe-android-malware-botnet-bans-tv-box-maker/)). The takedown of the command-and-control domains also cut off at least 10 million additional compromised devices, including karaoke machines and telehealth hardware; Japan's National Police Agency, Lumen, HUMAN Security, Plume, Synthient and TrendAI assisted, and Google says Videostrong exploited a gap in its security tests by loading the malicious code after first boot ([Google Cloud](https://cloud.google.com/blog/topics/threat-intelligence/shutting-the-door-on-the-xcpe-botnet); [BleepingComputer](https://www.bleepingcomputer.com/news/security/google-disrupts-million-device-xcpe-android-malware-botnet-bans-tv-box-maker/)).
