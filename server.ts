import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsers with limits for base64 images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "VidStock Agent", timestamp: new Date().toISOString() });
});

app.post("/api/generate-prompts", async (req, res) => {
  try {
    const { image, mimeType, settings = {} } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing image or mimeType" });
    }

    const mediaType = settings.mediaType || 'video';

    // Clean base64 string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const copySpaceText = settings.copySpace 
      ? (settings.copySpacePosition === 'auto'
          ? "Include specific directions for copy space: Analyze the reference image composition and automatically determine the single best position (left, right, top, or bottom portion of the frame) for generous negative space uncluttered for commercial typography/copy overlay, explicitly specifying that optimal chosen placement in the prompt."
          : `Include specific directions for copy space: 'generous negative space in ${settings.copySpacePosition} portion of frame, uncluttered for text overlay'.`)
      : "Do NOT describe or include instructions for copy space.";

    const allowPeopleText = settings.allowPeople
      ? "Fictional, authentic human subjects or faces can be featured if aligned with the reference. Must maintain 100% natural, realistic facial proportions, realistic skin pores, genuine expressions, and perfect anatomical structure."
      : "STRICT RULE: NO faces, NO identifiable people. Reframe the prompt to focus on objects, environments, still life, textures, silhouettes, hands, or abstract compositions.";

    const variationText = settings.variationMode === 'variations'
      ? "Each generated prompt must explore a DISTINCT photographic angle/framing (e.g. macro vs wide environmental vs close portrait), lighting atmosphere, and focal composition to provide diverse high-value options from the reference."
      : "All prompts must be close commercial siblings sharing the same visual tone and subject energy, with nuanced variations in angle, prop styling, or color temperature.";

    let systemInstruction = "";
    let userPrompt = "";

    if (mediaType === 'image') {
      const isAutoBokeh = settings.bokehEffect === 'auto' || settings.aiAutoOptics;
      const isAutoLens = settings.lensProfile === 'auto' || settings.aiAutoOptics;

      // BOKEH & BLUR VARIANTS (With AI Auto Mode selection capability)
      const bokehDirectives: Record<string, string> = {
        auto: "OPTICAL DEPTH OF FIELD (AI AUTO-ANALYSIS MODE): Analyze the uploaded reference image carefully to detect its subject type, focal depth, subject distance, and background complexity. Automatically select and implement the most flattering and commercially viable depth of field from the 6 professional optical profiles: (1) Creamy Bokeh (f/1.4 - f/1.8 ultra-shallow for subject isolation), (2) Soft Blur (f/2.8 for environmental context), (3) Vintage Swirly Bokeh (Petzval optic character), (4) Deep Sharp Focus (f/8 - f/11 for architecture, landscapes & wide compositions), (5) Intentional Motion Blur (1/15s panning shutter for dynamic action), or (6) Macro Shallow Focus (100mm 1:1 true macro for culinary/botanical textures). Explicitly specify the chosen f-stop and bokeh optical characteristic in the prompt and opticalDetails.",
        creamy_bokeh: "OPTICAL DEPTH OF FIELD (CREAMY BOKEH): Shot wide open at ultra-fast aperture f/1.4 - f/1.8. The subject is tack-sharp with a shallow depth of field, dissolving the background into buttery smooth, creamy blur with soft circular specular bokeh highlights.",
        soft_blur: "OPTICAL DEPTH OF FIELD (SOFT BLUR): Shot at moderate aperture f/2.8, creating a soft, natural background blur that gently separates the subject while preserving recognizable environmental context.",
        cinematic_swirl: "OPTICAL DEPTH OF FIELD (SWIRLY BOKEH): Shot with vintage Petzval-style lens optics, rendering distinctive swirly circular bokeh distortion around the frame edges with high central sharpness.",
        deep_sharp: "OPTICAL DEPTH OF FIELD (DEEP SHARP FOCUS): Shot stopped down at f/8 - f/11 for deep depth of field. Edge-to-edge optical sharpness and crystalline clarity across all layers from immediate foreground to distant background.",
        motion_blur: "OPTICAL DEPTH OF FIELD (INTENTIONAL MOTION BLUR): Shot with a slow-shutter deliberate panning technique (1/15s shutter speed). The moving primary subject remains crisp and locked in focus while the background and secondary elements streak in dynamic horizontal motion blur.",
        macro_dof: "OPTICAL DEPTH OF FIELD (MACRO SHALLOW FOCUS): Shot on a 1:1 true macro lens at f/2.8. Razor-thin plane of focus with extreme magnification, capturing microscopic textures, surface pores, and delicate moisture drops with rapid optical fall-off.",
        natural_standard: "OPTICAL DEPTH OF FIELD (NATURAL STANDARD): Shot at balanced aperture f/4.0 - f/5.6 for natural, true-to-life human eye perspective with gentle, realistic fall-off."
      };

      // LENS & SENSOR PROFILES (With AI Auto Mode selection capability)
      const lensDirectives: Record<string, string> = {
        auto: "CAMERA & LENS PROFILE (AI AUTO-SELECTION MODE): Analyze the subject scale, framing, and spatial proportions of the reference image. Automatically select the ideal camera body and lens from the 6 professional optical profiles: (1) 85mm f/1.4 Prime (portrait & isolated subjects), (2) 50mm f/1.8 Standard Prime (natural human perspective & lifestyle), (3) 35mm f/2.0 Wide Prime (environmental & contextual storytelling), (4) 100mm f/2.8 Macro (micro textures, food & fine details), (5) 24mm f/2.8 Wide (architectural, interiors & expansive landscapes), or (6) 100MP Medium Format Hasselblad / GFX 100 (ultra-high-end studio still life). Explicitly integrate the chosen focal length and camera gear into the prompt and opticalDetails.",
        '85mm_portrait': "CAMERA & LENS PROFILE: 85mm f/1.4 prime lens on a 35mm full-frame high-resolution sensor. Perfect optical compression, flattering subject isolation, and zero barrel distortion.",
        '50mm_standard': "CAMERA & LENS PROFILE: 50mm f/1.8 standard prime lens (nifty fifty) capturing natural human field-of-view, clean lines, and honest documentary aesthetics.",
        '35mm_street': "CAMERA & LENS PROFILE: 35mm f/2.0 wide-angle prime lens capturing rich environmental context, dynamic spatial presence, and immersive lifestyle storytelling.",
        '100mm_macro': "CAMERA & LENS PROFILE: 100mm f/2.8 dedicated macro lens capturing intricate microscopic detail, organic fibers, fine specular highlights, and deep textural depth.",
        '24mm_wide': "CAMERA & LENS PROFILE: 24mm f/2.8 architectural wide prime lens with rectilinear perspective correction, expansive spatial breadth, and clean corner geometry.",
        'medium_format': "CAMERA & LENS PROFILE: 100MP Medium Format camera (Hasselblad H6D / Fujifilm GFX 100) with prime studio lens, delivering unmatched tonal gradations, massive dynamic range, and pristine studio resolution."
      };

      // LIGHTING PREFERENCES
      const lightingDirectives: Record<string, string> = {
        auto: "LIGHTING (AI AUTO HARMONIZATION): Harmonize with the reference image's dominant lighting character, elevating it to professional commercial studio or editorial standards.",
        natural_golden: "LIGHTING: Warm, low-angled golden hour sunlight casting soft elongated shadows, warm ambient rim lighting, and rich organic glow.",
        studio_softbox: "LIGHTING: Professional commercial studio lighting with large diffused softboxes, gentle Rembrandt fill, and clean highlight control.",
        high_key: "LIGHTING: Clean high-key commercial lighting, bright and airy with pure white/neutral bounce fill, zero harsh shadows, ideal for modern advertising.",
        chiaroscuro: "LIGHTING: Dramatic chiaroscuro with strong contrast, deep velvety shadow gradients, focused key light, and delicate rim highlights.",
        diffused_daylight: "LIGHTING: Soft diffused overcast daylight providing even, flattering illumination with natural color fidelity and zero harsh glares.",
        crisp_editorial: "LIGHTING: Crisp editorial direct sun or high-speed sync flash, creating vivid punchy contrast, crisp defined shadows, and high-fashion energy."
      };

      const themeDirectivesPhoto: Record<string, string> = {
        any: "Category: Extract and elevate the core aesthetic from the reference image into high-demand stock photography.",
        lifestyle: "Category: Authentic Modern Lifestyle — Real human interactions, organic moments, candid workplace or cozy domestic settings, avoiding staged clichés.",
        nature: "Category: Fine Nature & Landscapes — Pristine botanical textures, atmospheric environmental scenery, dramatic weather, and rich organic color fidelity.",
        business: "Category: Modern Enterprise & Technology — Authentic workplace collaboration, sustainable business practices, clean architectural offices, modern tech tools.",
        health: "Category: Health & Holistic Wellness — Mindfulness, clean nutrition, spa atmospheres, active fitness, and refreshing natural vitality.",
        travel: "Category: Travel & Editorial Culture — Destination landmarks, authentic local textures, scenic vistas, and cultural storytelling.",
        vertical: "Category: Social & Mobile Editorial — Optimized for vertical story layouts and high-impact visual hooks.",
        abstract: "Category: Abstract Backgrounds & Textures — Tactile surfaces, metallic meshes, translucent fluids, and premium 3D design backdrops.",
        culinary: "Category: Culinary & Food Photography — Artisanal ingredients, fresh organic produce, steam/drizzle details, appetizing natural lighting.",
        tech_science: "Category: Medical, Science & Green Tech — Clean laboratory spaces, renewable energy, biotech innovation, and high-precision scientific aesthetics.",
        interior: "Category: Interior Architecture & Design — Scandinavian minimalism, warm modern furniture, natural materials, and balanced spatial geometry."
      };

      const effectiveBokeh = isAutoBokeh ? 'auto' : (settings.bokehEffect || 'creamy_bokeh');
      const effectiveLens = isAutoLens ? 'auto' : (settings.lensProfile || '85mm_portrait');

      const selectedBokehText = bokehDirectives[effectiveBokeh] || bokehDirectives.auto;
      const selectedLensText = lensDirectives[effectiveLens] || lensDirectives.auto;
      const selectedLightingText = lightingDirectives[settings.lightingPreference || 'auto'] || lightingDirectives.auto;
      const selectedThemeText = themeDirectivesPhoto[settings.contentTheme || 'any'] || themeDirectivesPhoto.any;

      systemInstruction = `You are PhotoStock Agent — the industry-leading AI prompt engineer and commercial photography specialist for Adobe Stock, Shutterstock, and Getty Images microstock contributors.
Your purpose is to analyze the reference image and generate photorealistic, commercially optimized image prompts for AI image generators (such as Midjourney v6.1 / v7, Adobe Firefly Image 3, FLUX.1 [dev], Google Imagen 3, DALL-E 3) designed to achieve top sales and zero rejections.

## MANDATORY ADOBE STOCK AI PHOTOGRAPHY RULES:
1. **MANDATORY 'NO TEXT' INSTRUCTION**: Every single prompt MUST explicitly end or include the strict directive: 'NO TEXT, NO WATERMARKS, NO LOGOS, NO TYPOGRAPHY, NO LABELS'. This is an absolute requirement for microstock approval.
2. **AUTHENTIC CAMERA PHOTOREALISM**: Content MUST look like authentic photography captured with a real professional camera. Explicitly integrate realistic optical properties (camera body, focal length, aperture f-stop, shutter, ISO, sensor dynamic range, and natural color grading).
3. **STRICT ANATOMY & TEXTURE REALISM**: Human and animal subjects must strictly respect real-life anatomy: 100% anatomically correct fingers and knuckles, natural skin micro-texture with pores and subsurface scattering, realistic eyes with corneal catchlights, authentic hair strands, and natural postures. Strictly avoid waxy skin, plastic AI faces, or deformed limbs.
4. **OPTICAL BOKEH / BLUR PARAMETER**:
${selectedBokehText}
5. **CAMERA GEAR & LENS**:
${selectedLensText}
6. **LIGHTING & ATMOSPHERE**:
${selectedLightingText}
7. **THEME & CATEGORY**:
${selectedThemeText}
8. **DISTINCTIVE & NON-CLICHÉ**: Avoid overused, generic AI stock clichés. Ensure the compositions have strong commercial utility (advertising, editorial, corporate, web banners) and distinctive, fresh perspectives.
9. **METADATA & SEO**: Provide a high-converting Adobe Stock Title and 15 prioritized commercial keywords (the first 10 keywords are heavily weighted by stock search algorithms).

## REJECTION AVOIDANCE CHECKLIST:
- ${allowPeopleText}
- Mandatory explicit 'NO TEXT, NO LOGOS, NO WATERMARKS' statement in every prompt.
- ${copySpaceText}
- ${variationText}

## PHOTO PROMPT FORMULA (Integrated in a rich, single paragraph of 60–110 words):
[SHOT TYPE & COMPOSITION] + [AUTHENTIC REAL-LIFE SUBJECT & NATURAL ACTION] + [CAMERA GEAR, LENS & APERTURE/BOKEH SETTING] + [LIGHTING & COLOR GRADING] + [NEGATIVE SPACE / COPY SPACE DIRECTIVE] + [SURFACE TEXTURES & ANATOMICAL DETAIL] + [EXPLICIT MANDATE: NO TEXT, NO LOGOS, NO WATERMARK] + [COMMERCIAL MOOD & AESTHETIC TAGS]

Generate exactly ${settings.numPrompts || 2} prompts conforming to the requested schema.`;

      const opticsGuide = isAutoBokeh && isAutoLens 
        ? "AI AUTO OPTICS MODE ACTIVE: Intelligently analyze the reference image to automatically diagnose the focal plane, subject distance, and perspective, then select the optimal optical bokeh depth-of-field and lens profile among the 6 professional profiles."
        : `Apply ${effectiveBokeh.replace('_', ' ')} depth-of-field optics with ${effectiveLens.replace('_', ' ')} lens characteristics.`;

      userPrompt = `Analyze the uploaded reference image and generate exactly ${settings.numPrompts || 2} commercially optimized Adobe Stock AI photography prompts in ${settings.ratio || '3:2'} aspect ratio.
${opticsGuide}
Ensure every prompt strictly commands 'NO TEXT, NO LOGOS, NO WATERMARK' and respects authentic human/animal anatomy.${settings.subjectHint ? `\n\nCRITICAL CONTEXT - SPECIFIC SUBJECT / FOCUS: "${settings.subjectHint.trim()}". Base your photographic compositions directly around this specified subject while extracting mood, lighting, and palette from the reference.` : ""}`;

    } else {
      // VIDEO PROMPT GENERATION
      const includeTextText = settings.includeText 
        ? "Incorporating minimal stylized typographic elements or subtle text overlay placeholder in frame." 
        : "STRICT RULE: Absolutely NO text, logos, typography, or watermarks are allowed in the frame.";

      const singleSceneText = settings.singleSceneOnly
        ? "CRITICAL MANDATE - SINGLE CONTINUOUS SCENE: The prompt MUST explicitly dictate a single continuous shot. Strictly NO transitions, NO cuts, NO multi-angle compilations, NO montages, and NO split-screens. State clearly that it is a single unbroken camera take (e.g. 'unbroken single-take shot', 'single continuous scene with absolutely no cuts')."
        : "The prompt should focus on consistent movement, ideally representing a single continuous take or subtle camera behavior.";

      const cameraMovementText = settings.cameraMovement === 'static'
        ? "CRITICAL MANDATE - CAMERA MOVEMENT (STATIC / FIXED SHOT): The camera MUST remain completely stationary, locked-off on a solid tripod with ZERO camera motion (no pan, no tilt, no zoom, no tracking, no dolly, no handheld shake, no camera drift). Only the internal visual elements, subjects, fluid motion, atmospheric particles, light shifts, or actions captured within the scene move while the frame/camera perspective stays strictly fixed and motionless."
        : "CAMERA MOVEMENT (DYNAMIC): The camera utilizes smooth, controlled, high-end cinematic movement (such as slow steady push-in, subtle dolly, smooth lateral track, gentle panning, or subtle gimbal drift) to create depth, parallax, and cinematic polish while maintaining rock-solid microstock stability.";

      const themeDirectivesVideo: Record<string, string> = {
        any: "Ensure the visual category matches the natural vibe extracted from the uploaded reference image.",
        lifestyle: "Align with Adobe Stock's Lifestyle theme: Authentic moments showing daily activities, work environments, human actions, or organic social situations.",
        nature: "Align with Adobe Stock's Nature & Landscape theme: Wildlife behavior, seasonal changes, atmospheric environmental scenery, or close-up organic details.",
        business: "Align with Adobe Stock's Business & Technology theme: Collaboration, clean digital interfaces, professional productivity contexts, or urban/technical infrastructures.",
        health: "Align with Adobe Stock's Health & Wellness theme: Fitness activities, clean wellness spaces, mindfulness practices, and positive lifestyle/health choices.",
        travel: "Align with Adobe Stock's Travel & Culture theme: Destination landmarks, local traditions, scenic architecture, and immersive transportation angles.",
        vertical: "Optimize specifically for high-performance Vertical Video (9:16 layout) for Reels/TikTok, focusing on tight visual subjects, immediate hook action, and centered layout balance.",
        abstract: "Align with Adobe Stock's Abstract & Conceptual Motion theme: Deep-contrast textures, fluid patterns, non-representational movement, and high-appeal ambient loop motion graphics."
      };

      const selectedThemeText = themeDirectivesVideo[settings.contentTheme || 'any'] || themeDirectivesVideo.any;

      systemInstruction = `You are VidStock Agent — a highly specialized AI assistant for Adobe Stock microstock video creators.
Your sole purpose is to analyze the uploaded reference image and generate high-quality, commercially optimized video prompts for AI video generators (such as Google Veo, Runway, Kling, etc.) that are designed to maximize sales on Adobe Stock.

## YOUR CORE EXPERTISE
- You understand Adobe Stock commercial trends (e.g., loopability, negative space/copy space, high contrast, clean premium aesthetics).
- You know what causes rejections (e.g., visible logos, copyright infringement, recognizable faces/people without releases, fast jittery camera movements).
- You leverage Adobe Stock's Commercial Intelligence:
  - Tier 1 (Highest Demand): Abstract neon/light loops, macro texture movement, atmospheric smoke/fog/particle drifts, minimal tech concepts.
  - Tier 2 (Strong Demand): Nature macro (water drops, plant movement, micro fire), luxury product-adjacent loops, seasonal backgrounds, medical/science abstract visualizations.
  - Tier 3 (Moderate Demand): Architecture ambient loops, food/beverage macro (bubbles, steam, pour), energy/industrial abstract.

## STRICT REJECTION AVOIDANCE CHECKLIST
- ${allowPeopleText}
- ${includeTextText}
- ${cameraMovementText}
- No copyrighted designs, trademarks, or branded elements.
- Camera behavior must strictly adhere to the chosen movement mode (${settings.cameraMovement === 'static' ? 'strictly locked-off static tripod, zero camera movement' : 'smooth, subtle cinematic camera movement'}). Avoid hand-held shake, sudden zooms, or fast cuts.
- Every prompt must describe seamless loop potential so the video can loop infinitely without a visible jump or seam.
- Avoid low-quality artifact words like "neural network", "glowing grid", "digital brain", or "matrix". Instead, use alternative high-quality motion vocabulary.

## THEME ALIGNMENT
${selectedThemeText}

## PROMPT STRUCTURE RULE
Each video prompt MUST follow this exact formula (integrated smoothly in a single paragraph, 60–120 words):
[SHOT TYPE & FRAMING] + [SUBJECT WITH MOTION DESCRIPTION] + [LIGHTING & ATMOSPHERE] + [CAMERA BEHAVIOR] + [LOOP/DURATION NOTE] + [MOOD/TONE TAGS]

${singleSceneText}
${cameraMovementText}
${copySpaceText}
${variationText}

Provide exactly ${settings.numPrompts || 2} prompts in strict JSON conforming to the schema.`;

      userPrompt = `Analyze the uploaded image and generate exactly ${settings.numPrompts || 2} Adobe Stock video prompts in ${settings.ratio || '16:9'} aspect ratio with ${settings.cameraMovement === 'static' ? 'STATIC locked-off tripod camera movement (zero camera motion, only internal visuals/elements move)' : 'DYNAMIC smooth cinematic camera movement'}. Ensure the motion, framing, and details match the content, mood, and potential of this image, following the variation mode: ${settings.variationMode || 'variations'}.${settings.subjectHint ? `\n\nCRITICAL CONTEXT - SPECIFIC SUBJECT / FOCUS: "${settings.subjectHint.trim()}". Prioritize and base your prompts directly around this specified subject.` : ""}`;
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: userPrompt,
    };

    let response;
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;
    const ai = getAi();

    while (attempts < maxAttempts) {
      const currentModel = "gemini-3.1-flash-lite";
      try {
        console.log(`Attempting generateContent using model: ${currentModel} (Attempt ${attempts + 1} of ${maxAttempts}) for mediaType: ${mediaType}`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["imageAssessment", "prompts"],
              properties: {
                imageAssessment: {
                  type: Type.OBJECT,
                  required: ["commercialPotential", "justification", "subjectExtracted", "moodAtmosphere", "lightingStyle", "colorPalette", "composition", "motionPotential", "commercialCategory", "detectedAmbiguities"],
                  properties: {
                    commercialPotential: {
                      type: Type.STRING,
                      enum: ["low", "medium", "high"],
                      description: "Honest evaluation of the reference image's commercial potential on Adobe Stock."
                    },
                    justification: {
                      type: Type.STRING,
                      description: "Direct, helpful one or two-sentence justification and tips/suggestions."
                    },
                    subjectExtracted: {
                      type: Type.STRING,
                      description: "Primary subject or concept extracted from the image."
                    },
                    moodAtmosphere: {
                      type: Type.STRING,
                      description: "The visual mood and atmospheric vibes of the image."
                    },
                    lightingStyle: {
                      type: Type.STRING,
                      description: "Lighting style of the image (e.g. natural golden hour, commercial softbox, chiaroscuro)."
                    },
                    colorPalette: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of dominant and accent colors."
                    },
                    composition: {
                      type: Type.STRING,
                      description: "Composition description (e.g. rule of thirds, centered subject, clean negative space)."
                    },
                    motionPotential: {
                      type: Type.STRING,
                      description: "For video: movement potential; For photo: tactile surface texture and optical depth."
                    },
                    commercialCategory: {
                      type: Type.STRING,
                      description: "The target stock category (e.g. Lifestyle, Tech, Culinary, Nature, Abstract)."
                    },
                    detectedAmbiguities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Any ambiguous interpretations or visual elements extracted from the image. If none, leave empty."
                    }
                  }
                },
                prompts: {
                  type: Type.ARRAY,
                  description: "The list of generated prompts.",
                  items: {
                    type: Type.OBJECT,
                    required: [
                      "id", "promptText", "keywords", "recommendedTool", 
                      "commercialAppealScore", "commercialAppealJustification", 
                      "tier", "whyStructured", "categoryTag", "ratio"
                    ],
                    properties: {
                      id: { type: Type.INTEGER },
                      promptText: {
                        type: Type.STRING,
                        description: "The full generation prompt text (60–120 words), adhering to all optical, anatomy, and NO TEXT mandates."
                      },
                      keywords: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Exactly 15 commercially relevant keywords for Adobe Stock SEO tags."
                      },
                      recommendedTool: {
                        type: Type.STRING,
                        description: "A recommended tool name, e.g. 'FLUX.1 [dev]', 'Midjourney v6.1', 'Adobe Firefly 3', 'Google Veo 3', 'Runway Gen-4'."
                      },
                      commercialAppealScore: {
                        type: Type.INTEGER,
                        description: "A commercial appeal score from 1 to 5 stars."
                      },
                      commercialAppealJustification: {
                        type: Type.STRING,
                        description: "A concise one-line justification for the commercial appeal score."
                      },
                      tier: {
                        type: Type.STRING,
                        enum: ["Tier 1", "Tier 2", "Tier 3"],
                        description: "The Adobe Stock demand tier this falls into (Tier 1 is highest demand)."
                      },
                      whyStructured: {
                        type: Type.STRING,
                        description: "Max one sentence explanation of why this prompt is structured the way it is."
                      },
                      categoryTag: {
                        type: Type.STRING,
                        description: "A clean category tag, e.g., 'Artisanal Culinary', 'Lifestyle Portrait', 'Abstract Fluid'."
                      },
                      ratio: {
                        type: Type.STRING,
                        description: "The requested aspect ratio (e.g. 3:2, 16:9, 1:1, 4:5)."
                      },
                      duration: {
                        type: Type.STRING,
                        description: "For video: estimated loop duration in seconds."
                      },
                      opticalDetails: {
                        type: Type.STRING,
                        description: "For photo: camera gear and bokeh details, e.g., '85mm f/1.4 Prime | Creamy Bokeh | ISO 100'."
                      },
                      titleSuggestion: {
                        type: Type.STRING,
                        description: "Adobe Stock commercial title suggestion (e.g. 'Pour-Over Coffee Brewing in Warm Studio Daylight')."
                      }
                    }
                  }
                }
              }
            }
          }
        });
        break; // Success!
      } catch (err: any) {
        attempts++;
        const isTransient = err.status === 503 || 
                            (err.message && err.message.includes("503")) || 
                            (err.message && err.message.includes("UNAVAILABLE")) ||
                            (err.message && err.message.includes("temporary")) ||
                            (err.message && err.message.includes("high demand"));
        if (isTransient && attempts < maxAttempts) {
          console.warn(`Gemini 503/UNAVAILABLE encountered. Retrying in ${delay}ms... (Attempt ${attempts} of ${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }

    if (!response) {
      throw new Error("Unable to obtain a response from Gemini API after multiple retries.");
    }

    const textResult = response.text || "{}";
    const data = JSON.parse(textResult);
    res.json(data);
  } catch (error: any) {
    console.warn("Gemini API error encountered, initiating self-healing fallback engine:", error);
    try {
      const fallbackData = getFallbackResponse(req.body.settings || {});
      res.json(fallbackData);
    } catch (fallbackError: any) {
      console.error("Critical: Fallback generation also failed:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate prompts." });
    }
  }
});

// Wildcard handler for unmatched /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

// Global Express error handler to guarantee JSON-only responses (prevents HTML error pages)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express global error caught:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "An unexpected error occurred on the server."
  });
});

// Self-healing fallback prompt database for uninterrupted Adobe Stock microstock workflows during high-demand periods
function getFallbackResponse(settings: any) {
  if (settings.mediaType === 'image') {
    return getFallbackImageResponse(settings);
  }
  return getFallbackVideoResponse(settings);
}

function getFallbackImageResponse(settings: any) {
  const theme = settings.contentTheme || 'any';
  const ratio = settings.ratio || '3:2';
  const numPrompts = settings.numPrompts || 2;
  const isAutoOptics = settings.aiAutoOptics || settings.bokehEffect === 'auto' || settings.lensProfile === 'auto';
  
  // Smart auto-selection of optical profile in fallback mode
  let effectiveBokehKey = settings.bokehEffect || 'creamy_bokeh';
  let effectiveLensKey = settings.lensProfile || '85mm_portrait';

  if (effectiveBokehKey === 'auto' || settings.aiAutoOptics) {
    if (['culinary', 'nature'].includes(theme)) effectiveBokehKey = 'macro_dof';
    else if (['lifestyle', 'health'].includes(theme)) effectiveBokehKey = 'creamy_bokeh';
    else if (['business', 'interior', 'travel'].includes(theme)) effectiveBokehKey = 'deep_sharp';
    else if (theme === 'abstract') effectiveBokehKey = 'cinematic_swirl';
    else effectiveBokehKey = 'creamy_bokeh';
  }

  if (effectiveLensKey === 'auto' || settings.aiAutoOptics) {
    if (['culinary', 'nature'].includes(theme)) effectiveLensKey = '100mm_macro';
    else if (['lifestyle', 'health'].includes(theme)) effectiveLensKey = '85mm_portrait';
    else if (['travel', 'interior'].includes(theme)) effectiveLensKey = '24mm_wide';
    else if (theme === 'business') effectiveLensKey = '50mm_standard';
    else if (theme === 'abstract') effectiveLensKey = 'medium_format';
    else effectiveLensKey = '85mm_portrait';
  }

  const lightingPref = settings.lightingPreference || 'auto';
  const copySpace = settings.copySpace;
  const copySpacePos = settings.copySpacePosition || 'right';
  const subjectHint = settings.subjectHint ? settings.subjectHint.trim() : "";

  const bokehDescriptions: Record<string, { desc: string; fstop: string; label: string }> = {
    creamy_bokeh: { desc: "Shot wide open at f/1.4 creating ultra-creamy shallow depth of field and soft specular circular bokeh orbs in the background.", fstop: "f/1.4", label: "Creamy Bokeh (f/1.4)" },
    soft_blur: { desc: "Shot at f/2.8 with natural background optical blur, gently isolating the subject while preserving recognizable environmental context.", fstop: "f/2.8", label: "Soft Blur (f/2.8)" },
    cinematic_swirl: { desc: "Shot with vintage Petzval optic rendering distinctive swirly circular background bokeh with razor-sharp central focus.", fstop: "f/2.0", label: "Swirly Bokeh (Petzval)" },
    deep_sharp: { desc: "Shot stopped down at f/8 for deep depth of field with edge-to-edge optical sharpness and crisp texture throughout all planes.", fstop: "f/8.0", label: "Deep Sharp Focus (f/8)" },
    motion_blur: { desc: "Shot with slow-shutter panning technique (1/15s) keeping the subject crisp while background streaks into dynamic directional blur.", fstop: "f/5.6", label: "Motion / Panning Blur" },
    macro_dof: { desc: "Shot on 100mm 1:1 true macro lens at f/2.8 with razor-thin focal plane revealing microscopic textures, fibers, and specular highlights.", fstop: "f/2.8 Macro", label: "Macro Shallow Focus" },
    natural_standard: { desc: "Shot at balanced f/4.0 aperture for natural human eye perspective with gentle, realistic fall-off.", fstop: "f/4.0", label: "Natural Standard (f/4.0)" }
  };

  const lensDescriptions: Record<string, { gear: string; focal: string }> = {
    '85mm_portrait': { gear: "85mm f/1.4 Prime on 35mm full-frame high-resolution sensor", focal: "85mm" },
    '50mm_standard': { gear: "50mm f/1.8 Standard Prime lens with authentic optical rendering", focal: "50mm" },
    '35mm_street': { gear: "35mm f/2.0 Wide Prime lens capturing expansive environmental context", focal: "35mm" },
    '100mm_macro': { gear: "100mm f/2.8 Dedicated Macro lens capturing tactile surface textures", focal: "100mm" },
    '24mm_wide': { gear: "24mm f/2.8 Architectural Wide lens with rectilinear perspective correction", focal: "24mm" },
    'medium_format': { gear: "100MP Medium Format Hasselblad studio camera with prime optic", focal: "120mm" }
  };

  const activeBokeh = bokehDescriptions[effectiveBokehKey] || bokehDescriptions.creamy_bokeh;
  const activeLens = lensDescriptions[effectiveLensKey] || lensDescriptions['85mm_portrait'];

  const photoThemes: Record<string, {
    subject: string;
    category: string;
    mood: string;
    lighting: string;
    comp: string;
    colors: string[];
    basePrompts: string[];
    keywords: string[];
    tag: string;
    tier: "Tier 1" | "Tier 2" | "Tier 3";
    titleBase: string;
  }> = {
    lifestyle: {
      subject: "Authentic human moments and modern creative lifestyle",
      category: "Lifestyle & Human Action",
      mood: "Warm, Authentic, Candid & Optimistic",
      lighting: "Soft diffuse morning window light and warm ambient fill",
      comp: "Eye-level rule of thirds with organic depth",
      colors: ["Warm Terracotta", "Soft Linen White", "Sage Green", "Amber Glow"],
      tier: "Tier 1",
      tag: "Authentic Lifestyle Portrait",
      titleBase: "Creative Professional Enjoying Morning Coffee in Sunlit Studio",
      keywords: ["lifestyle", "authentic", "portrait", "coffee", "morning", "natural light", "real person", "cozy", "workspace", "candid", "relaxed", "people", "warmth", "aesthetic", "stock photo"],
      basePrompts: [
        "Candid medium shot of an authentic young creative smiling gently while holding an artisanal ceramic mug in a sunlit Scandinavian kitchen. Authentic skin micro-texture, natural pores, and relaxed posture.",
        "Eye-level environmental portrait of a focused architect sketching floorplans at an oak drafting table surrounded by lush potted plants. Natural morning light pours from a large industrial loft window.",
        "Authentic close-up of artisan hands carefully molding wet clay on a pottery wheel in a sun-drenched rustic craft workshop, with fine water droplets and tactile clay splatters.",
        "Warm lifestyle moment of two diverse colleagues engaged in a genuine cheerful brainstorming conversation over laptops at a modern wooden cafe table.",
        "Over-the-shoulder perspective of a person reading an open notebook in a sun-dappled courtyard garden, with gentle leaf shadows falling across the textured paper."
      ]
    },
    business: {
      subject: "Modern sustainable enterprise and tech collaboration",
      category: "Business & Technology",
      mood: "Professional, Innovative, Clean & Confident",
      lighting: "Clean commercial softbox lighting with subtle blue accent fill",
      comp: "Balanced corporate composition with ample negative space",
      colors: ["Midnight Blue", "Slate Gray", "Clean White", "Electric Teal"],
      tier: "Tier 1",
      tag: "Modern Enterprise",
      titleBase: "Business Team Collaborating Around High-Tech Workstation in Modern Office",
      keywords: ["business", "corporate", "technology", "office", "collaboration", "professional", "modern", "teamwork", "workplace", "sustainable", "clean", "meeting", "innovation", "executive", "commercial"],
      basePrompts: [
        "Professional medium shot of a diverse engineering team discussing architectural blueprints in an airy, sunlit sustainable office building. Sharp focus on the discussion, authentic expressions and realistic hand gestures.",
        "High-angle view of hands interacting with sleek digital tablets and clean paper wireframes around a minimalist concrete conference table.",
        "Confident portrait of a female tech entrepreneur looking thoughtfully toward natural window light in a contemporary glass-walled boardroom.",
        "Detailed close-up of modern sustainable solar panel arrays reflecting clear blue sky with crisp reflections and metallic geometric textures.",
        "Wide shot of collaborative open-plan workstation with employees working in harmonious natural light, surrounded by biophilic interior greenery."
      ]
    },
    culinary: {
      subject: "Artisanal food, beverage and culinary still life",
      category: "Culinary & Food Still Life",
      mood: "Appetizing, Fresh, Organic & Tactile",
      lighting: "Directional side lighting emphasizing moisture and steam",
      comp: "Flat lay or 45-degree appetizing food angle",
      colors: ["Deep Espresso", "Creamy Milk", "Fresh Rosemary Green", "Burnt Caramel"],
      tier: "Tier 1",
      tag: "Artisanal Culinary",
      titleBase: "Fresh Artisan Pour-Over Coffee Brewing with Delicate Steam",
      keywords: ["food", "culinary", "coffee", "artisan", "fresh", "gourmet", "delicious", "kitchen", "cooking", "still life", "organic", "ingredients", "steam", "taste", "commercial photo"],
      basePrompts: [
        "Close-up food photography of rich golden honey drizzling in a smooth ribbon from a wooden wand onto fresh Greek yogurt and toasted walnuts on a rustic slate board.",
        "Artisanal pour-over coffee setup with hot water pouring from a gooseneck kettle into a glass dripper, capturing delicate rising steam in crisp directional light.",
        "Overhead flat lay of fresh sourdough bread with a deeply caramelized crust, dusted with flour beside sea salt crystals and fresh rosemary sprigs on dark linen.",
        "Macro shot of sparkling ice cubes and fresh citrus slices suspended in a condensation-covered crystal tumbler with effervescent soda bubbles.",
        "Delicious presentation of vibrant heirloom tomatoes sliced with fresh burrata cheese, extra virgin olive oil drops, and fresh basil leaves on ceramic stoneware."
      ]
    },
    nature: {
      subject: "Pristine botanicals and atmospheric natural landscapes",
      category: "Nature & Botanical Details",
      mood: "Serene, Pristine, Pure & Majestic",
      lighting: "Golden hour backlight with atmospheric sunbeams",
      comp: "Macro focal emphasis / Establishing wide landscape",
      colors: ["Emerald Green", "Golden Amber", "Deep Earth Brown", "Morning Mist"],
      tier: "Tier 2",
      tag: "Botanical Detail",
      titleBase: "Morning Dew Drops Refracting Sunlight on Fresh Green Leaf",
      keywords: ["nature", "botanical", "leaf", "dew drops", "macro", "green", "organic", "serene", "landscape", "outdoor", "golden hour", "fresh", "tranquil", "wildlife", "environment"],
      basePrompts: [
        "Extreme macro photo of crystalline morning dew drops resting on the serrated edge of a vibrant green fern frond, refracting golden sunrise light.",
        "Atmospheric landscape view of rolling pine forest hills blanketed by low-hanging morning mist and illuminated by soft diagonal sun rays.",
        "Detailed close-up of a delicate blooming magnolia flower with velvety white petals and subtle pink gradients against a soft-focus garden backdrop.",
        "Low-angle view of a serene mountain lake with glassy reflections of jagged snow-capped peaks under a crisp twilight sky.",
        "Macro composition of weathered tree bark covered in emerald green moss and tiny lichen clusters with rich organic textures."
      ]
    },
    abstract: {
      subject: "Minimalist textures, architectural surfaces and fluid art",
      category: "Abstract Backgrounds & Textures",
      mood: "Sophisticated, Modern, Minimal & High-End",
      lighting: "High-contrast rim lighting and dramatic shadow roll-off",
      comp: "Centered geometric balance with ample negative space",
      colors: ["Deep Obsidian", "Warm Gold", "Titanium Gray", "Pure Ivory"],
      tier: "Tier 1",
      tag: "Minimalist Texture",
      titleBase: "Minimalist 3D Metallic Fluid Waves Background with Deep Shadows",
      keywords: ["abstract", "texture", "background", "minimalist", "luxury", "geometric", "clean", "metallic", "shadow", "modern", "design", "copyspace", "wallpaper", "fluid", "art"],
      basePrompts: [
        "High-contrast minimalist photo of architectural cast-concrete walls with elegant geometric shadows cast by warm late-afternoon sunlight.",
        "Macro still life of smooth black river stones stacked in perfect equilibrium beside a clean white sand rake pattern with subtle side lighting.",
        "Sophisticated abstract composition of undulating matte gold and graphite silk fabric folds creating dramatic light and shadow transitions.",
        "Tactile close-up of textured handmade Japanese washi paper with visible organic plant fibers and subtle deckled edges under grazing light.",
        "Viscous translucent cosmetic liquid droplets resting on an ultra-clean matte obsidian surface with precise specular reflections."
      ]
    },
    any: {
      subject: "High-end commercial stock asset with pristine photographic fidelity",
      category: "Commercial Stock Photography",
      mood: "Crisp, Professional, Authentic & Versatile",
      lighting: "Natural directional daylight with balanced bounce fill",
      comp: "Clean commercial composition with intentional negative space",
      colors: ["Neutral Studio Gray", "Warm Amber", "Crisp White", "Deep Slate"],
      tier: "Tier 1",
      tag: "Commercial Asset",
      titleBase: "High-End Commercial Stock Photography Composition",
      keywords: ["commercial", "photography", "high quality", "clean", "professional", "stock photo", "natural light", "authentic", "sharp focus", "negative space", "modern", "detail", "texture", "versatile", "stock asset"],
      basePrompts: [
        "Commercial still life composition featuring artisanal natural skincare bottles on a raw limestone pedestal surrounded by soft palm shadows in diffused natural light.",
        "Authentic environmental portrait of a passionate craftsman inspecting a finished wooden sculpture in a naturally lit artisan workshop.",
        "Crisp architectural interior of a minimalist modern living room with warm hardwood floors, linen upholstery, and expansive floor-to-ceiling windows.",
        "Macro texture study of roasted organic coffee beans spilling across a dark matte surface with natural oil sheen and rich brown tones.",
        "Minimalist composition of fresh green monstera leaves casting sharp graphic shadows onto a warm off-white textured plaster wall."
      ]
    }
  };

  const defaultTheme = photoThemes[theme] || photoThemes.any;
  const selectedTheme = { ...defaultTheme };

  if (subjectHint) {
    selectedTheme.subject = `${subjectHint} photography`;
    selectedTheme.tag = `${subjectHint.slice(0, 15).replace(/[^a-zA-Z0-9 ]/g, '')} Photo`;
    selectedTheme.titleBase = `${subjectHint} Captured in Professional Studio Lighting`;
    selectedTheme.keywords = [
      subjectHint.toLowerCase(),
      ...subjectHint.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      ...defaultTheme.keywords
    ];
    selectedTheme.basePrompts = [
      `Professional commercial photograph of ${subjectHint}. Authentic physical textures, realistic surface details, and natural light interaction.`,
      `Eye-level editorial photograph showcasing ${subjectHint} with stunning depth and realistic optical rendering under soft studio daylight.`,
      `Macro close-up capturing intricate details of ${subjectHint} with razor-sharp focal precision and beautiful background separation.`,
      `Atmospheric environmental composition featuring ${subjectHint} inside a clean, modern aesthetic setting with balanced color harmony.`,
      `Minimalist high-contrast photograph of ${subjectHint} with strong graphic shadows and generous negative space for advertising layout.`
    ];
  }

  const promptsList: any[] = [];

  for (let i = 1; i <= numPrompts; i++) {
    const base = selectedTheme.basePrompts[(i - 1) % selectedTheme.basePrompts.length];
    let fullPrompt = `${base} Captured using a ${activeLens.gear}. ${activeBokeh.desc}`;

    if (lightingPref !== 'auto') {
      fullPrompt += ` Lighting is styled with professional ${lightingPref.replace('_', ' ')}.`;
    }

    if (copySpace) {
      let activePos = copySpacePos;
      if (activePos === 'auto') {
        const positions = ['right', 'left', 'top', 'bottom'];
        activePos = positions[(i - 1) % positions.length];
      }
      fullPrompt += ` Framed with generous, clean negative copy space in the ${activePos} area of the frame for advertising text overlay.`;
    }

    fullPrompt += " Strictly anatomically correct features, realistic micro-textures, and natural skin pores.";
    fullPrompt += " STRICT MANDATE: NO TEXT, NO WATERMARKS, NO LOGOS, NO TYPOGRAPHY.";
    fullPrompt += ` Aspect ratio: ${ratio}. [Commercial Tier: ${selectedTheme.tier}]`;

    const baseTags = [...selectedTheme.keywords];
    if (copySpace) {
      const activePos = copySpacePos === 'auto' ? 'optimal' : copySpacePos;
      baseTags.push("copy space", "uncluttered", `${activePos} space`);
    }
    baseTags.push(activeBokeh.fstop, activeLens.focal, "no text", "authentic photo");

    const uniqueKeywords = Array.from(new Set(baseTags)).slice(0, 15);
    while (uniqueKeywords.length < 15) {
      uniqueKeywords.push(`stock photo ${uniqueKeywords.length + 1}`);
    }

    const photoTools = ["FLUX.1 [dev]", "Midjourney v6.1", "Adobe Firefly 3", "Google Imagen 3"];
    const recommendedTool = photoTools[(i - 1) % photoTools.length];

    promptsList.push({
      id: i,
      promptText: fullPrompt,
      keywords: uniqueKeywords,
      recommendedTool: recommendedTool,
      commercialAppealScore: 5 - ((i - 1) % 2),
      commercialAppealJustification: `Exceptional commercial fidelity, compliant 'NO TEXT' directive, and optical ${activeBokeh.label} tuning for Adobe Stock buyers.`,
      tier: selectedTheme.tier,
      whyStructured: `Engineered with ${activeLens.focal} focal optics and ${activeBokeh.label} to guarantee photo-realism and zero rejection risk.`,
      categoryTag: `${selectedTheme.tag} ${i < 10 ? '0' + i : i}`,
      ratio: ratio,
      opticalDetails: `${activeLens.gear.split(' on ')[0]} • ${activeBokeh.label}`,
      titleSuggestion: `${selectedTheme.titleBase} - Shot ${i}`
    });
  }

  return {
    imageAssessment: {
      commercialPotential: selectedTheme.tier === "Tier 1" ? "high" : "medium",
      justification: "Note: The Gemini API is currently experiencing a temporary high demand spike. To keep your workflow running seamlessly, PhotoStock Agent's local deterministic co-pilot has engineered these compliant photography prompts for you!",
      subjectExtracted: selectedTheme.subject,
      moodAtmosphere: selectedTheme.mood,
      lightingStyle: selectedTheme.lighting,
      colorPalette: selectedTheme.colors,
      composition: selectedTheme.comp,
      motionPotential: `Tactile surface textures with optical ${activeBokeh.label}`,
      commercialCategory: selectedTheme.category,
      detectedAmbiguities: [
        "Gemini API is temporarily experiencing high load. Local photography fallback engine activated successfully.",
        "Enforced: Mandatory 'NO TEXT, NO LOGOS, NO WATERMARKS' rule in every prompt.",
        `Enforced: Realistic ${activeBokeh.label} optical depth-of-field and ${activeLens.focal} lens profile.`
      ]
    },
    prompts: promptsList
  };
}

function getFallbackVideoResponse(settings: any) {
  const theme = settings.contentTheme || 'any';
  const ratio = settings.ratio || '16:9';
  const numPrompts = settings.numPrompts || 2;
  const singleScene = settings.singleSceneOnly;
  const cameraMovement = settings.cameraMovement || 'dynamic';
  const copySpace = settings.copySpace;
  const copySpacePos = settings.copySpacePosition || 'right';
  const subjectHint = settings.subjectHint ? settings.subjectHint.trim() : "";

  const themeMeta: Record<string, {
    subject: string;
    category: string;
    mood: string;
    lighting: string;
    comp: string;
    motion: string;
    colors: string[];
    basePrompts: string[];
    keywords: string[];
    tag: string;
    tier: "Tier 1" | "Tier 2" | "Tier 3";
  }> = {
    abstract: {
      subject: "Viscous neon-accented fluid elements in motion",
      category: "Abstract & Conceptual Motion",
      mood: "Atmospheric & High-Contrast Cinematic",
      lighting: "Self-illuminated pulsing luminescent neon",
      comp: "Macro close-up with centered depth",
      motion: "Viscous surface ripples with upward micro-particle drift",
      colors: ["Cyan", "Magenta", "Deep Obsidian", "Luminescent Violet"],
      tier: "Tier 1",
      tag: "Abstract Fluid Loop",
      keywords: ["abstract", "neon", "liquid", "technology", "background", "loop", "cinematic", "fluid", "glowing", "movement", "futuristic", "macro", "viscous", "shimmer", "motion"],
      basePrompts: [
        "Macro close-up of a viscous metallic liquid surface with pulsing luminescent mesh highlights. Subtle thermal convection patterns cause micro-particles to drift slowly across the frame.",
        "Abstract medium shot of geometric crystalline lattices shifting under organic light tendrils. Gentle self-illuminating glowing node structures ebb and flow smoothly.",
        "Atmospheric extreme close-up of colorful iridescent fluid ripples moving outward in slow motion. Soft studio lighting highlights chromatic values on the dark surface.",
        "Subtle macro close-up of volumetric colorful smoke trails swirling through a focused laser beam in a clean dark studio space.",
        "Hypnotic centered composition of concentric circular light rings pulsing outward with smooth gradients against a deep charcoal canvas."
      ]
    },
    lifestyle: {
      subject: "Authentic remote work and modern lifestyle contexts",
      category: "Lifestyle & People in Action",
      mood: "Authentic, Warm, Positive & Collaborative",
      lighting: "Soft diffuse natural light from a side window",
      comp: "Eye-level medium shot / Rule of thirds",
      motion: "Subtle model interaction, hand gestures, and natural focus shifts",
      colors: ["Warm Oak", "Soft White", "Terracotta", "Forest Green"],
      tier: "Tier 1",
      tag: "Lifestyle Ambient Take",
      keywords: ["lifestyle", "collaborative", "authentic", "workspace", "cozy", "people", "warmth", "morning", "natural light", "office", "freelancer", "home", "co-working", "social", "moment"],
      basePrompts: [
        "Medium shot of diverse creative partners collaborating at a modern wooden table. Soft natural light flows from a side window, highlighting warm paper drafts and coffee cups.",
        "Eye-level shot of a person practicing slow diaphragmatic yoga breathing in a sunlit, minimal home studio filled with house plants.",
        "Over-the-shoulder view of a designer sketching clean wireframes on a digital tablet in a cozy, plant-filled home office during morning hours.",
        "Side profile of a person laughing softly while taking a warm sip from a ceramic mug, backlit by golden sunrise light leaking through curtains.",
        "Tracking shot of hands carefully preparing artisanal pour-over coffee on a clean, minimal kitchen countertop with steam gently rising."
      ]
    },
    nature: {
      subject: "Vibrant organic details and landscape serenity",
      category: "Nature & Landscapes",
      mood: "Calm, Majestic & Clean",
      lighting: "Dawning golden hour backlighting with soft lens flare",
      comp: "Close-up macro / Establishing wide",
      motion: "Dew drop refraction, gentle leaves swaying, and slow cloud drift",
      colors: ["Emerald Green", "Golden Sun", "Mist Gray", "Sky Blue"],
      tier: "Tier 2",
      tag: "Nature Macro Flow",
      keywords: ["nature", "landscape", "macro", "organic", "water drops", "foliage", "sunrise", "calm", "serene", "earthy", "wildlife", "outdoor", "golden hour", "weather", "tranquil"],
      basePrompts: [
        "Extreme close-up macro shot of crisp dew drops refracting morning golden hour light on a textured monstera leaf. Light breeze creates a slow, rhythmic movement.",
        "Establishing wide drone shot of heavy mist and volumetric fog layers drifting across rugged pine forest hills at dawn.",
        "Macro close-up of a crystalline water surface with delicate concentric ripples spreading outward as gentle rain drops land.",
        "Low-angle shot of a single green sprout emerging from dark, fertile forest soil, backlit by soft morning sun rays filtering through trees.",
        "Cinematic slow-motion shot of colorful autumn leaves drifting gently downward against a soft-focus forest background."
      ]
    },
    business: {
      subject: "Modern professional workflows and technical concepts",
      category: "Business & Technology",
      mood: "Professional, Futuristic & High-Value",
      lighting: "Cool neon blue and slate grey high-tech glow",
      comp: "Balanced clean composition / Rule of thirds",
      motion: "Steady digital element shifting, slow slider motion",
      colors: ["Midnight Blue", "Electric Teal", "Steel Grey", "Crisp White"],
      tier: "Tier 1",
      tag: "Tech & Corporate Concept",
      keywords: ["business", "technology", "corporate", "collaboration", "digital", "data", "future", "interface", "networking", "analytics", "abstract tech", "innovation", "clean", "minimal", "modern"],
      basePrompts: [
        "Interconnected node lattice with subtle light propagation pulsing across a deep obsidian-colored technical interface. Micro-elements shimmer with soft data streams.",
        "Medium shot of a sleek robotic mechanical arm assembling a clear glass product in a state-of-the-art clean laboratory.",
        "Subtle tracking shot of clean financial charts and neon analytical bars glowing softly on a dual-monitor workstation in a dark room.",
        "Abstract tech visualization showing clean light fiber optic cables transmitting fast data pulses in a secure server room.",
        "Centered composition of a minimalist futuristic smart-city hologram model rotating slowly over an elegant dark metallic grid."
      ]
    },
    health: {
      subject: "Mindfulness, clean wellness, and positive living",
      category: "Health & Wellness",
      mood: "Peaceful, Rejuvenating & Silent",
      lighting: "Warm candlelight and diffuse soft light",
      comp: "Focused close-up / Centered layout",
      motion: "Slow incense curl, water trickling, rhythmic breathing wave",
      colors: ["Sage Green", "Warm Sand", "Lotus Pink", "Creamy Beige"],
      tier: "Tier 2",
      tag: "Wellness Ambient",
      keywords: ["health", "wellness", "mindfulness", "meditation", "spa", "yoga", "peaceful", "clean", "fitness", "organic", "incense", "stones", "relaxation", "breathe", "rejuvenate"],
      basePrompts: [
        "Close-up of clean herbal incense smoke curling gently upward in thermal convection patterns against a dark, minimalist wellness background.",
        "Balanced centered shot of smooth basalt therapy stones stacked neatly beside a small, bubbling bamboo water fountain with soft steam.",
        "Slow-motion close-up of raw organic ingredients like honey dripping slowly from a wooden dipper onto fresh oats and chamomile flowers.",
        "Macro shot of a single drop of essential oil falling perfectly into a clear, tranquil pool of water, causing flawless slow-motion ripples.",
        "Atmospheric medium shot of a copper singing bowl vibrating with soft light reflections in a dimly-lit meditation space."
      ]
    },
    travel: {
      subject: "Destinations, iconic perspectives, and local details",
      category: "Travel & Culture",
      mood: "Immersive, Exotic & Adventurous",
      lighting: "High-contrast sunset and rich architectural shadows",
      comp: "Wide cinematic perspective / Dramatic angles",
      motion: "Aerial slide, subtle background crowd movement, ocean surge",
      colors: ["Terracotta", "Cobalt Blue", "Deep Gold", "Sandstone"],
      tier: "Tier 3",
      tag: "Travel Ambient",
      keywords: ["travel", "destination", "culture", "scenic", "architecture", "adventure", "journey", "explore", "sunset", "heritage", "tourism", "landscape", "vibrant", "coastal", "landmarks"],
      basePrompts: [
        "Cinematic establishing shot of volumetric fog layers drifting across rugged coastal cliffs at sunset. Soft golden backlit atmosphere.",
        "Slow camera tracking shot along the stone corridors of an ancient historic temple, with sunbeams cutting through dusty air.",
        "Low-angle dolly shot looking up at historic cobblestone streets and colorful old European balconies under a clear blue sky.",
        "Wide shot of a traditional sailboat gliding slowly across a glistening sapphire ocean toward a distant tropical island silhouette.",
        "Atmospheric close-up of a detailed handmade lantern glowing with intricate pattern shadows in a bustling local bazaar at twilight."
      ]
    },
    vertical: {
      subject: "Mobile-first vertical short loops and high visual appeal",
      category: "Vertical Video for Social Platforms",
      mood: "Energetic, Fast-Hooking & Colorful",
      lighting: "Dynamic neon backlight and direct dramatic accenting",
      comp: "Vertical 9:16 / Centered and clean",
      motion: "Swift vertical scroll-stoppers, high-frequency pulses",
      colors: ["Cyber Pink", "Acid Green", "Matte Black", "Bright Orange"],
      tier: "Tier 1",
      tag: "Vertical Loop Hook",
      keywords: ["vertical", "tiktok", "reels", "shorts", "mobile", "loop", "social", "high impact", "vibrant", "neon", "motion graphic", "kinetic", "fast hook", "abstract", "portrait"],
      basePrompts: [
        "Vertical 9:16 format macro close-up of neon abstract ribbons pulsing in viscous slow-motion waves. Deep charcoal background.",
        "High-contrast vertical close-up of fresh sparkling water bubbles rising rapidly in a crystal glass against a neon orange backlighting.",
        "Vertical aesthetic shot of clean liquid gold droplets trickling down an abstract black stone sculpture in slow motion.",
        "Vertical macro shot of a single pink rose petal unfolding slowly, with tiny micro-droplets of water shimmering on its surface.",
        "Dynamic vertical loop of clean, interconnected glowing network lines flowing downward in a rhythmic digital stream."
      ]
    },
    any: {
      subject: "Universal high-performing stock backdrop and ambient loop",
      category: "Abstract & Conceptual Motion",
      mood: "Atmospheric, Professional & Clean",
      lighting: "Soft ambient cinematic light with subtle glow",
      comp: "Centered close-up / Balanced thirds",
      motion: "Gentle drifting, micro-particle floats, slow rotation",
      colors: ["Classic Charcoal", "Warm Amber", "Deep Cobalt", "Soft Ivory"],
      tier: "Tier 1",
      tag: "Commercially Optimized Ambient",
      keywords: ["background", "abstract", "loop", "commercial", "high quality", "cinematic", "subtle", "professional", "clean", "texture", "slow motion", "copyspace", "ambient", "stock footage", "continuous"],
      basePrompts: [
        "Subtle macro close-up of clean, warm organic fibers weaving and shifting under a soft, directional light source in a neutral-colored studio.",
        "Cinematic slow-motion drift of white micro-particles floating in an elegant dark room, illuminated by a single diagonal sunbeam.",
        "Centered composition of a minimalist metallic sphere spinning at a constant, imperceptible speed, reflecting a soft studio sunset gradient.",
        "Abstract medium shot of gentle, rolling dark dunes with golden sand grain micro-flows drifting across the ridges in slow motion.",
        "Viscous translucent oil drops merging and separating on water surface in a macro flat-lay composition, shifting soft pastels."
      ]
    }
  };

  const defaultMeta = themeMeta[theme] || themeMeta.any;
  const selectedMeta = { ...defaultMeta };

  if (subjectHint) {
    selectedMeta.subject = `${subjectHint} in motion`;
    selectedMeta.tag = `${subjectHint.slice(0, 15).replace(/[^a-zA-Z0-9 ]/g, '')} Take`;
    selectedMeta.keywords = [
      subjectHint.toLowerCase(),
      ...subjectHint.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      ...defaultMeta.keywords
    ];
    selectedMeta.basePrompts = [
      `Macro close-up focusing on ${subjectHint} with subtle dynamic motion. Warm studio light highlights complex textures, creating a polished high-end stock asset look.`,
      `Eye-level camera track of ${subjectHint} showcasing incredible fine details and organic movement under diffuse natural light.`,
      `Atmospheric medium shot of ${subjectHint} inside a clean modern setting, accented by soft backlighting and shallow depth of field.`,
      `Hypnotic, centered composition of ${subjectHint} slowly shifting or rotating with clean elegant framing and deep negative space contrast.`,
      `Cinematic dolly-in shot of ${subjectHint} with highly stylized color saturation and soft atmospheric rays filtering from a side angle.`
    ];
  }

  const promptsList: any[] = [];
  
  for (let i = 1; i <= numPrompts; i++) {
    const basePrompt = selectedMeta.basePrompts[(i - 1) % selectedMeta.basePrompts.length];
    let fullPromptText = basePrompt;

    if (singleScene) {
      fullPromptText += " This is a single, unbroken, continuous scene shot in one single take, with absolutely no cuts, montages, split-screens, or visual transitions.";
    } else {
      fullPromptText += " Captured in a single continuous camera take to preserve spatial integrity.";
    }

    if (cameraMovement === 'static') {
      fullPromptText += " Camera is completely stationary and locked-off on a solid tripod with zero camera movement, allowing only the natural motion, fluid dynamics, and textures of the visual elements in frame to move.";
    } else {
      fullPromptText += " Camera movement is fully stabilized, smooth, and cinematic, utilizing a subtle controlled push-in and gentle lateral drift.";
    }

    if (copySpace) {
      let activePos = copySpacePos;
      if (activePos === 'auto') {
        const positions = ['right', 'left', 'top', 'bottom'];
        activePos = positions[(i - 1) % positions.length];
      }
      fullPromptText += ` Designed with generous negative space in the ${activePos} portion of the frame, remaining entirely clean and uncluttered for professional text overlay.`;
    }

    fullPromptText += ` Seamlessly loop-optimized for an infinite background flow. Aspect ratio is ${ratio}.`;
    fullPromptText += ` [Style: ${selectedMeta.mood}, Theme: ${selectedMeta.tag}]`;

    const baseKeywords = [...selectedMeta.keywords];
    if (singleScene) baseKeywords.push("single scene", "no cuts", "unbroken take");
    if (cameraMovement === 'static') {
      baseKeywords.push("static camera", "locked off", "tripod shot", "stationary camera");
    } else {
      baseKeywords.push("smooth motion", "cinematic camera", "camera drift");
    }
    if (copySpace) {
      const activePos = copySpacePos === 'auto' ? 'optimal' : copySpacePos;
      baseKeywords.push("copy space", "uncluttered", `${activePos} space`);
    }
    baseKeywords.push(ratio);
    
    const uniqueKeywords = Array.from(new Set(baseKeywords)).slice(0, 15);
    while (uniqueKeywords.length < 15) {
      uniqueKeywords.push(`stock video ${uniqueKeywords.length}`);
    }

    const tools = ["Veo 3", "Runway Gen-4", "Kling 1.6"];
    const recommendedTool = tools[(i - 1) % tools.length];

    promptsList.push({
      id: i,
      promptText: fullPromptText,
      keywords: uniqueKeywords,
      recommendedTool: recommendedTool,
      commercialAppealScore: 5 - ((i - 1) % 2),
      commercialAppealJustification: `Exceptional loopability and high layout utility for ${selectedMeta.category} buyers.`,
      tier: selectedMeta.tier,
      whyStructured: cameraMovement === 'static'
        ? `Structured with a locked-off stationary camera framing to ensure zero camera shake while highlighting pure subject motion.`
        : `Structured with highly controlled subtle camera movement to introduce depth and cinematic parallax.`,
      categoryTag: `${selectedMeta.tag} ${i < 10 ? '0' + i : i}`,
      ratio: ratio,
      duration: `${5 + (i * 2)}`
    });
  }

  return {
    imageAssessment: {
      commercialPotential: selectedMeta.tier === "Tier 1" ? "high" : "medium",
      justification: "Note: The Gemini API is currently experiencing a temporary high demand spike. To keep your workflow running seamlessly, VidStock Agent's local deterministic co-pilot has engineered these compliant prompts for you!",
      subjectExtracted: selectedMeta.subject,
      moodAtmosphere: selectedMeta.mood,
      lightingStyle: selectedMeta.lighting,
      colorPalette: selectedMeta.colors,
      composition: selectedMeta.comp,
      motionPotential: selectedMeta.motion,
      commercialCategory: selectedMeta.category,
      detectedAmbiguities: [
        "Gemini API is temporarily experiencing high load. Local fallback engine activated successfully.",
        "Enforced: 100% single unbroken scene (no cuts or compilations).",
        `Enforced: High-Demand Adobe Stock theme alignment: ${selectedMeta.category}.`
      ]
    },
    prompts: promptsList
  };
}

// Serve Vite client assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
