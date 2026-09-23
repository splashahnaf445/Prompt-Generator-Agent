# Generative Prompt Agent



**Generative Prompt Agent** is a specialized computer vision and prompt engineering agent built to reverse-engineer commercial-grade prompts from input images and video sequences. Purpose-built for microstock creators, creative directors, and generative artists, the agent deconstructs physical camera optics, lighting environments, and marketplace trends to generate 4 to 5 ready-to-render prompt variations tuned for Midjourney, FLUX, Stable Diffusion, and Adobe Firefly.

---

## ⚡ Key Features

- **Dual-Mode Media Ingestion:** Process static images or extract temporal keyframes and motion characteristics from video clips.
- **Analytical AI Optics Extraction:** Automatically identifies and simulates camera physics, including bokeh depth ($f/1.4$ to $f/8$), macro magnification, vintage glass (Petzval), and panning motion blur.
- **Sensor & Glass Profiling:** Emulates real-world lens setups (24mm, 35mm, 50mm, 85mm, 100mm Macro) and medium-format aesthetics like Hasselblad systems.
- **Commercial Lighting Harmonization:** Analyzes highlights, shadows, and color temperatures from reference media to enforce clean, high-key commercial or editorial tones.
- **Marketplace Alignment:** Maps composition and terminology to high-performing stock criteria, standard aspect ratios (e.g., 3:2 DSLR/mirrorless, 16:9), and commercial tagging patterns[cite: 1].
- **Multi-Prompt Matrix:** Generates 4 to 5 diversified prompt permutations per asset across wide-angle, close-up, macro, and dynamic angles[cite: 1].

---

## 🎛️ Architecture & Controls

The interface exposes both zero-shot autonomous detection and manual optical fine-tuning[cite: 1]:

| Parameter | Mode / Scope | Description |

| **Input Source** | Image / Video | Toggle between static photo deconstruction and video frame analysis. |
| **Subject Description** | Optional / AI Match | Guide subject focus manually or let vision LLMs infer subject attributes |
| **AI Auto Mode** | Analytical AI | Automatically samples and auto-assigns 6 optical options from the reference 
| **Bokeh & Blur** | AI Auto Selected | Detects depth-of-field ($f/1.4$, $f/2.8$, $f/8$, Petzval, Macro, Panning)
| **Lens & Sensor Profile**| Hardware Match | Matches focal length (24mm–100mm Macro) and sensor profile (DSLR, Hasselblad)
| **Lighting Style** | Commercial Tone | Normalizes key, rim, and ambient lighting to fit commercial stock criteria
| **Aspect Ratio** | Adobe Stock Ratio | Formats prompts for standard ratios (3:2 DSLR, 16:9, 1:1, 9:16)
| **Marketplace Theme** | Trending / Stock Ref | Adjusts keywords according to commercial marketplace categories
| **Variation Strategy** | Creative Scope | Produces 4–5 diverse prompt branches exploring lighting, distance, and angles

---

## 🛠️ Quickstart

### Prerequisites

- Python 3.10+
- An API key for your preferred vision-language backbone (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, or local multimodal models via Ollama/vLLM)

- 📋 Prompt Variation Strategy OutputWhen processing an input asset, the engine outputs 4 to 5 distinct permutations designed to maximize stock catalog diversity:
- Commercial Hero: Crisp product/subject framing, balanced 3-point commercial light, standard 3:2 ratio.Dynamic Editorial: Action-oriented perspective, natural ambient light, contextual
- framing.Macro Detail: Close-up lens calibration ($100\text{mm}$, $f/2.8$) emphasizing textures, reflections, and micro-details.
- Environmental Angle: Wider perspective (24\{mm} or 35\}) showing subject integration in an authentic setting.
- Alternative Lighting Setup: Mood-shifted variation (golden hour, low-key rim lighting, or studio softbox) for diverse customer needs.
- 🤝 Contributing : Contributions, issues, and feature requests are welcome. Feel free to check the issues page if you want to contribute.Fork the Project
- Create your Feature Branch (git checkout -b feature/AmazingFeature)Commit your Changes (git commit -m 'Add some AmazingFeature')Push to the Branch (git push origin feature/AmazingFeature)
- Open a Pull Request
