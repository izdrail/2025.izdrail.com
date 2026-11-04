---
title: "Show Your Work"
description: "A funny take on the day's tech news: Anthropic open-sources a way to prove which AI model actually answered you, and the receipt costs up to 95 times the answer."
pubDate: 2026-11-04
---

*The speech below is satire. The events it riffs on are real and listed with sources at the bottom. The jokes are jokes - no quotes were invented, and every claim about Anthropic is attributed where it appears.*

One story today: Anthropic has released FlashProve, an open-source system that cryptographically proves which AI model answered you - because "the chatbot said so" no longer counts. Facts from Anthropic's research post and TechCrunch; the notary is mine.

![A worried cartoon elephant in a hoodie at a wooden notary desk at night, watching a tiny robot stamp a wax seal onto an oversized blank certificate tied by a red ribbon to a small chat speech bubble](/blog/show-your-work-hero.webp)

*Illustration generated for this post. The elephant is fine. The certificate is blank, which is still more than the chatbot offered.*

Anthropic has solved a problem most of us didn't know we had: when a chatbot answers you, there is currently no way to prove which chatbot it was. You picked the expensive model, but a routing service could have quietly poured you the own-brand version, and - this is Anthropic's own assessment - you could not reliably tell from the output alone, even if the output is good. The AI industry has finally admitted what the wine industry learned centuries ago: when the label is the only evidence, the label is decorative.

The fix is called FlashProve, and it is genuinely clever: each answer can come with a small cryptographic certificate - a zkSNARK - proving the reply came from the exact model weights the provider committed to, while revealing nothing about the weights themselves. Think of it as a tamper-evident seal for a thought. The certificate runs about 19 megabytes per thousand-token answer, so the receipt is considerably larger than the shopping, and generating it takes roughly 70 to 95 times the computer time of simply having the answer in the first place. Honesty, it turns out, is a compute multiplier.

My favourite detail is who did the work. According to Anthropic's own writeup, Claude - the AI - produced the cryptographic improvements and wrote the protocol specification, and Anthropic immediately adds that Claude "often makes decisions that are hard to evaluate". So the security guarantees are checked by Lean, a formal verification system that machine-checks the AI's homework. To summarise the chain of custody: the AI wrote the proof system, the proof system watches the AI, a proof assistant watches the proof system, and the humans audit the audit. It is not a trustless system so much as a trust turducken.

The punchline, per TechCrunch, is that there are no plans to actually deploy it - not at Anthropic, not anywhere. The lie detector has been built, open-sourced, formally verified and politely placed in a drawer. Which is fine. This was never really about today. It is a message in a bottle to a future where AI companies have to prove things - written, helpfully, by the AI.

That's today: Anthropic published a way to prove an AI's answer really came from that AI, the AI wrote most of the proof, the proof costs up to 95 times the answer, and nobody has to use it. The facts are Anthropic's and TechCrunch's; the notary's little wax seal is mine. Sources checked the morning of 4 Nov.

## The facts behind the jokes

Anthropic's Frontier Red Team released FlashProve, an open-source (Apache 2.0) prototype for "provable inference": a zkSNARK proof that an AI response came from the exact model the provider committed to, without revealing the model's private weights. Anthropic says users currently cannot tell whether a response came from the model they picked, a cheaper one swapped in by a routing service, or an attacker tampering with the token stream - and that judging from the output alone is unreliable "even if it produces high-quality responses". For a 400B-parameter model (Llama 4 Maverick, 4-bit), one H100 GPU generates proofs at about 110 tokens/second, each 1,024-token request gets a ~19 MB proof, proving takes roughly 70-95x the GPU time of running the model on vLLM, and checking a proof takes about 17 seconds on a 24-core CPU. Anthropic says Claude produced the zkSNARK improvements and wrote the protocol specification, with security guarantees machine-checked in the Lean formal verification language ([Anthropic](https://www.anthropic.com/research/provable-inference)). TechCrunch reports there are no plans to deploy the system at Anthropic or any other lab ([TechCrunch](https://techcrunch.com/2026/11/03/anthropic-is-working-on-a-system-to-prove-ai-models-identity/)).
