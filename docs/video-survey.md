# video-survey

A survey of generative AI tools for reels and long videos that Claude drives. Date of record:
2026-11-12. Prices and models change each month. Read each price again before you pay.

The survey has five parts:

1. What the projects already have.
2. Claude plugins, skills and MCP servers for video.
3. The video models and their providers.
4. How to edit and compose a long video.
5. How to make a clone of your own voice, in pt-BR and in English.

A claim that nobody checked has the mark ⚠. Each fact has a source in "Sources" at the end.
Some sources are vendor blogs. The table says so.

## In one minute

- **Voice.** Make one ElevenLabs Professional Voice Clone (PVC) in pt-BR. It needs 30 minutes of
  your speech at minimum, and 2 to 3 hours is better. The Creator plan ($22 a month) has one PVC
  slot. Then Claude writes the narration and the ElevenLabs MCP server speaks it.
- **Free voice path.** Keep the retro-2026 path (Piper, then OpenVoice V2). Give OpenVoice a clip
  of your own voice as the reference, not the voice of another person.
- **Clips.** Use the fal MCP server. One key reaches Veo 3.1, Kling, Seedance, Wan and MiniMax, and
  `get_pricing` tells the cost before each run.
- **Default models.** Veo 3.1 Fast or Lite for realistic B-roll with sound. Kling 3.0 or 4.0 for long
  multi-shot clips with the same character. Wan 3.0 or MiniMax H3 Max for cheap drafts.
- **Composition.** Write the edit as code: HyperFrames (HTML, Apache-2.0) or Remotion (React, free
  for one person). Both have an official Claude Code plugin. Keep Manim for the technical scenes.
- **Raw footage.** `browser-use/video-use` (MIT) cuts filler words, false starts and dead air from a
  transcript. It does the job that `talkinghead` did in retro-2026.
- **Not Sora.** OpenAI stopped the Sora app on 2026-04-26 and the Sora 2 API on 2026-09-24.

## 1. What the projects already have

| Where | What it does | Generative media? |
|---|---|---|
| `manim/retro-2026/` (project files) | The 2026 retrospective film: `script.py` (Piper `pt_BR-cadu-medium`, CC0), `convert.py` (OpenVoice V2 tone colour), `head.py` (Nash, a drawn cat whose mouth follows the loudness), `talkinghead` (cuts the take), `film.py` (Manim), `compose.py` (ffmpeg) | Voice only, local |
| `manim/retro-2026/seedance-prompts.md` | One Seedance prompt for each shot. No text, numbers, logos or real people in a prompt | Prompts only, nothing generated |
| piabrota/nix-os `docs/REELS.md` | The Reels Fabric: an OpenRig rig with five seats that makes a 15 s or 30 s reel from `screenplay.json` | No, by the owner's order of 2026-11-05: "Claude only" |
| piabrota/nix-os `docs/VIDEO-PIPELINE.md` | A draft spec for faceless videos of up to 15 minutes: brief, script, voice (Kokoro or Piper), `whisper.cpp`, visuals, mix, render, review gate | No |
| `skills/hermes/hermes-manim`, `video-indexer`, `voice-note` | Manim on the Hermes box, a YouTube video into pirsig, transcription | No |

Two results:

- The method is good and stays: the screenplay first, the narration before the picture, and the
  edit as code. Generative clips enter as one more source of shots.
- The Reels Fabric must stay "Claude only" until the owner changes that order. A generative path
  is a second pipeline, or a change to `docs/REELS.md` that the owner approves.

## 2. Claude plugins, skills and MCP servers

### Composition and editing (the edit as code)

| Tool | Licence | What it does | Install in Claude Code |
|---|---|---|---|
| HyperFrames (heygen-com/hyperframes) | Apache-2.0 | HTML, CSS and GSAP, Lottie or Three.js scenes into MP4. Headless Chrome and ffmpeg. Nine agent skills, a CLI and a studio | `claude plugin marketplace add heygen-com/hyperframes`, then `claude plugin install hyperframes@hyperframes` |
| Remotion (remotion-dev/claude-code-plugin, remotion-dev/skills) | Free for a person or a team of 3 or fewer. Else $25 a month for each coder | React compositions, captions, studio preview, render | `claude plugin marketplace add remotion-dev/claude-code-plugin`, then `claude plugin install remotion@remotion` |
| video-use (browser-use/video-use) | MIT | Raw footage in a folder, `final.mp4` out. Cuts fillers, false starts and dead air from an ElevenLabs Scribe transcript. Colour grade, 30 ms fades, burnt subtitles, overlays with HyperFrames, Remotion or Manim | Clone it, `ln -sfn` it into `~/.claude/skills/video-use`, `uv sync`, an `ELEVENLABS_API_KEY` in `.env` |
| manim-video (in video-use, and in Hermes) | see the repository | Technical animations in Manim Community | It comes with video-use. `hermes-manim` says how to run Manim on the Hermes box |
| davinci-resolve-mcp (samuelgursky) | MIT | Resolve timelines, Fusion and render through the Resolve scripting API | see its README ⚠ |
| DaVinci Resolve Studio 21.1 MCP (Blackmagic) | Studio licence ($295) | The official integration, from 2026-09-08 | In Resolve Studio ⚠ |
| Descript MCP | Descript plan | Edits by transcript, captions, reframe, publish. Hosted, OAuth | A remote MCP server ⚠ |
| Shotstack, Creatomate | Paid, with trial credits | A JSON edit or a template into MP4, in their cloud | A remote MCP server ⚠ |

### Generation (pictures, clips, voice)

| Tool | Official? | What it reaches | Install and cost |
|---|---|---|---|
| fal MCP | Yes, by fal | More than 600 models: video, image, speech, music. Tools: `search_models`, `get_model_schema`, `get_pricing`, `run_model`, `submit_job`, `check_job`, `get_job_result`, `cancel_job`, `upload_file` | `claude mcp add --transport http --scope user fal https://mcp.fal.ai/mcp-relay`, then `/mcp` and Authenticate. The server is free. You pay each run at the API price |
| ElevenLabs hosted MCP | Yes, by ElevenLabs | Speech, voice clone, voice design, transcription, speech to speech, audio isolation, sound effects | The remote server `https://api.elevenlabs.io/v1/mcp`, with OAuth. The local `elevenlabs-mcp` is archived |
| HeyGen MCP and skills | Yes, by HeyGen | Avatars, video agent, translation, lip sync | MCP with OAuth on a web plan with premium credits. The skills use an API key |
| Higgsfield MCP | Vendor | More than 30 video and image models, camera control | Free renders at first, plans from $15 a month (vendor claim) |
| Artlist MCP | Vendor | More than 100 models, with the outputs in your Artlist library | A paid AI-credit plan |
| Replicate MCP | Community | Models on Replicate | Pay for each run. Check that somebody still maintains it |

Recommendation: install HyperFrames or Remotion, the fal MCP server and the ElevenLabs hosted MCP
server. These three cover the picture, the clips and the voice with one bill for each.

## 3. Video models and providers

Prices are for each second of output, from the API, in October and November 2026. A plan price
is for each month.

| Model (maker) | Longest clip | Sound | Price | Use it for |
|---|---|---|---|---|
| Veo 3.1 (Google) | 8 s, can extend | Yes | Lite $0.05 (720p) to $0.08 (1080p). Fast $0.10 to $0.12, $0.30 at 4K. Full about $0.40 | Realism and sound in sync. Gemini API and Vertex AI. SynthID marks |
| Gemini Omni Flash (Google) | 8 s, can extend | Yes | about $0.10 | First on the Artificial Analysis board for video with sound, 2026-09-26 |
| Kling 3.0 and 4.0 (Kuaishou) | 15 s (3.0), 30 s (4.0) | Yes | 3.0: about $0.25 (720p) to $0.34 (1080p). Plan from $8.80 | Long multi-shot clips, lip sync for each character |
| Seedance 2.0 and 2.5 (ByteDance) | 15 s (2.0), 30 s (2.5) | Yes | 2.0: about $0.15. 2.5: $0.20 (480p) to $0.68 (1080p) | 30 s clips. You have the prompts already. Prices change with the host |
| Wan 3.0 (Alibaba) | about 10 s | Yes | $0.05 (480p) to $0.20 (1080p) | The lowest price. Builds up to 2.2 have open weights |
| MiniMax H3 Max, Hailuo 2.3 | 10 s | Yes | H3 Max about $0.04 | Cheap drafts with good physics |
| Runway Gen-4.5 and Aleph | about 10 s | Yes | Plans from $12 | Control: keyframes, motion brush, camera. Edits of a clip |
| Luma Ray3.2 | about 10 s | Yes | Credits | Prompt adherence |
| Sora 2 (OpenAI) | stopped | | | The API stopped on 2026-09-24. Do not build on it |

A cost example: a 30 s reel of six 5 s shots at 1080p. With Veo 3.1 Fast it is about $3.60 for one
take of each shot. Plan three takes of each shot, thus about $11. With Wan 3.0 at 480p the drafts
cost about $1.50.

## 4. Edit and compose a long video

A model makes 8 to 30 seconds. A long video is many short shots that one plan holds together.

1. **Write the screenplay first.** One file with the beats, as `screenplay.json` of the Reels
   Fabric or `beats.json` of retro-2026. Every later file names its beat id.
2. **Make the narration before the picture.** Speak the whole text with your clone, then align it
   with Whisper. The word times give the length of each shot. retro-2026 did this with `beats.json`.
3. **One shot is one beat.** Ask a model for one shot of 4 to 10 seconds. A long prompt for a long
   clip drifts. Keep text, numbers and logos out of the prompt. Add them in the edit.
4. **Keep the character the same.** Make one reference image of each character and each place.
   Give it as the start frame or the reference of each shot. Keep the seed in the shot list.
5. **Draft cheap, finish once.** Make drafts at 480p or 720p with Wan or Veo Lite. Make the chosen
   takes again at 1080p. Upscale only the final cut.
6. **Compose in code.** Put the clips, the Manim scenes, the captions and the sound in one
   HyperFrames or Remotion project. A change is a diff, and a render gives the same file again.
7. **Cut long videos into chapters.** Render each chapter of 1 to 3 minutes alone. Then join them
   with the ffmpeg concat demuxer. A failed chapter does not stop the others.
8. **Finish the sound last.** Normalise to -16 LUFS for social video, as `talkinghead` does. Lower
   the music under the voice with `sidechaincompress`.
9. **Check like the Reels Fabric QA seat.** Make a contact sheet, check the length, the loudness,
   the black frames and the captions. A person watches the whole video before it goes out.
10. **Label it.** Say on screen that the voice and some shots are generated. The platforms ask for a
    label on realistic generated media ⚠.
11. **For hand finishing**, open the project in Resolve through its MCP server, or export an EDL.

## 5. A clone of your own voice

You record once. After that, Claude writes and the clone speaks.

### The options

| Option | Audio you record | pt-BR | Licence and cost | Notes |
|---|---|---|---|---|
| ElevenLabs Professional Voice Clone | 30 min at minimum, 2 to 3 h is better | Yes, Eleven v4, more than 90 languages | Creator $22 a month (1 slot). Scale $299 (3 slots). Commercial use from Starter | The best quality here. You verify that the voice is yours. It works through the MCP server |
| ElevenLabs Instant Voice Clone | about 1 min ⚠ | Yes | Starter $6 a month | A quick test before you record the long set |
| Piper and OpenVoice V2 (now in retro-2026) | a short clip of your voice | Yes, `pt_BR-cadu-medium` | CC0 voice, OpenVoice MIT ⚠. Free, local | OpenVoice keeps Piper's words and timing and changes only the colour of the voice. It adds a watermark |
| Chatterbox Multilingual v3 (Resemble AI) | a short clip ⚠ | Yes, a `pt-br` dialect pack | MIT. Watermark on each output | Released 2026-06-10. Since August 2026 it has no support or updates |
| F5-TTS-pt-br (firstpixel) | 5 to 9 s | Yes, only pt-BR, 447 h of training data | CC BY-NC 4.0: not for commercial use | The card says "a preliminary test" |

### The steps (ElevenLabs PVC)

1. Use one quiet room with soft surfaces. Use one microphone, two fists from the mouth, with a pop
   filter. Use the same microphone for the verification.
2. Read your own texts aloud in pt-BR: posts, READMEs, the retro-2026 script. Use the tone that
   you want the clone to have. Do not sing.
3. Record 60 to 180 minutes in files of about 30 minutes. Keep the level at -23 to -18 dB RMS and
   the true peak near -3 dB. Export MP3 at 192 kbps or more. WAV does not make it better.
4. Remove the long pauses and the fillers before you upload. The clone copies them.
5. Upload to a Creator plan, then do the voice verification. Read each line once.
6. For English, test the pt-BR clone first. A clone keeps the accent of its samples. If the English
   is not good enough, record a second set in English. A second PVC needs the Scale plan.
7. Add the hosted MCP server. Then ask Claude for the narration of one beat, and listen to it.

### Two rules

- Clone only your own voice. ElevenLabs makes you verify that.
- Read the terms on the rights to your voice data before you upload. A rival vendor says the
  ElevenLabs terms of early 2025 asked for "perpetual, irrevocable, royalty-free" rights ⚠.

## Next step

A skill can hold this method: screenplay, clone narration, fal clips with a cost check,
HyperFrames or Remotion, QA. It needs the owner's choice of the plans and of the default model.

## Sources

| Fact | Source |
|---|---|
| Video models, clip lengths, prices, Sora dates | tech-insider.org, "Best AI video generator 2026" (data of September 2026). shattered.io, "Best AI video generators" (prices of October 2026) |
| MCP connectors for video (Artlist, fal, Higgsfield, Replicate, AI Box) | artlist.io blog, 2026 (Artlist is a vendor and lists itself first) |
| Video editing MCP servers, Resolve 21.1 | chatcut.io blog, 2026-11-04 (ChatCut is a vendor) |
| fal MCP command and tools | fal.ai docs: `setting-up/mcp/claude-code.md`, `setting-up/mcp.md` |
| ElevenLabs MCP | github.com/elevenlabs/elevenlabs-mcp (archived, points to the hosted server) |
| ElevenLabs PVC rules | elevenlabs.io docs, "Professional Voice Cloning" |
| ElevenLabs plans | elevenlabs.io/pricing, read 2026-11-12 |
| Remotion plugin and licence | tella.com blog on Remotion agent skills. remotion.dev/docs/license/faq |
| HyperFrames | github.com/heygen-com/hyperframes |
| video-use | github.com/browser-use/video-use |
| HeyGen MCP | heygen.com/api-pricing |
| Chatterbox Multilingual v3 | resemble.ai, "Chatterbox Multilingual v3" |
| F5-TTS-pt-br | huggingface.co/firstpixel/F5-TTS-pt-br |
| Instant clone sample length, ElevenLabs data terms | fish.audio blog, "Best AI voice cloning tools" (Fish Audio is a rival vendor) |
| retro-2026 pipeline | the project files `manim/retro-2026/` |
| Reels Fabric, video lab spec | piabrota/nix-os `docs/REELS.md`, `docs/VIDEO-PIPELINE.md` |
