export type MediaType = 'video' | 'image';

export type BokehEffect = 
  | 'auto'              // AI Auto Mode: AI automatically detects and selects the optimal bokeh/blur profile from reference image
  | 'creamy_bokeh'      // Creamy Bokeh (f/1.4 - f/1.8 shallow depth of field, circular orbs)
  | 'soft_blur'          // Soft Background Blur (f/2.8 gentle subject separation)
  | 'cinematic_swirl'   // Swirly Vintage Bokeh (Petzval optic character)
  | 'deep_sharp'        // Deep Hyper-Sharp Focus (f/8 - f/11 edge-to-edge optical clarity)
  | 'motion_blur'       // Intentional Motion Blur / Panning (sharp subject, dynamic streak blur)
  | 'macro_dof'         // Macro Extreme Shallow Depth (100mm macro razor texture)
  | 'natural_standard'; // Natural Standard Depth (f/4.0 balanced rendering)

export type LensProfile = 
  | 'auto'              // AI Auto Mode: AI automatically matches the ideal lens gear and sensor profile
  | '85mm_portrait'     // 85mm f/1.4 Prime (Commercial subject isolation & portraits)
  | '50mm_standard'     // 50mm f/1.8 Prime (Natural human perspective & documentary)
  | '35mm_street'       // 35mm f/2.0 Wide Prime (Environmental & lifestyle storytelling)
  | '100mm_macro'       // 100mm f/2.8 Macro (Culinary, botanicals, micro textures)
  | '24mm_wide'         // 24mm f/2.8 Wide (Interiors, architecture & expansive scenery)
  | 'medium_format';    // Medium Format 100MP (Hasselblad / GFX high-resolution studio)

export type LightingPreference = 
  | 'auto'              // Detect from reference image
  | 'natural_golden'    // Natural Golden Hour / Warm Sunlight
  | 'studio_softbox'    // Soft Commercial Studio Softbox / Rembrandt
  | 'high_key'          // Clean High-Key Commercial (Bright, minimal backdrop)
  | 'chiaroscuro'       // Dramatic Moody Chiaroscuro / Rim Light
  | 'diffused_daylight' // Soft Diffused Overcast Daylight
  | 'crisp_editorial';  // Crisp Editorial Flash / Direct Sun

export interface GenerationSettings {
  mediaType: MediaType; // 'video' | 'image'
  includeText: boolean;
  copySpace: boolean;
  copySpacePosition: 'left' | 'right' | 'top' | 'bottom' | 'auto';
  ratio: '16:9' | '9:16' | '1:1' | '4:5' | '2.39:1' | '3:2' | '2:3' | '4:3' | '3:4';
  cameraMovement: 'static' | 'dynamic'; // For video: static (fixed/locked) or dynamic (motion)
  aiAutoOptics?: boolean;               // Master AI Auto Mode toggle for photo optics
  bokehEffect: BokehEffect;             // For photo: Bokeh & depth of field variant
  lensProfile: LensProfile;             // For photo: Lens & camera gear simulation
  lightingPreference: LightingPreference;
  numPrompts: number;
  variationMode: 'variations' | 'similar';
  allowPeople: boolean; // Settings option for faces/people
  singleSceneOnly: boolean; // For video: Ensure single scene, no cuts or compilations
  contentTheme: 'any' | 'lifestyle' | 'nature' | 'business' | 'health' | 'travel' | 'vertical' | 'abstract' | 'culinary' | 'tech_science' | 'interior';
  subjectHint?: string; // User description/hint to align results
}

export interface ImageAssessment {
  commercialPotential: 'low' | 'medium' | 'high';
  justification: string;
  subjectExtracted: string;
  moodAtmosphere: string;
  lightingStyle: string;
  colorPalette: string[];
  composition: string;
  motionPotential: string; // or visual texture potential for images
  commercialCategory: string;
  detectedAmbiguities: string[];
}

export interface GeneratedPrompt {
  id: number;
  promptText: string;
  keywords: string[]; // exactly 15 keywords
  recommendedTool: string;
  commercialAppealScore: number; // 1 to 5
  commercialAppealJustification: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  whyStructured: string;
  categoryTag: string;
  ratio: string;
  duration?: string; // For video
  opticalDetails?: string; // For photo (lens, f-stop, bokeh)
  titleSuggestion?: string; // Adobe Stock commercial submission title
}

export interface GenerationResponse {
  imageAssessment: ImageAssessment;
  prompts: GeneratedPrompt[];
}
