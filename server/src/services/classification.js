// AI classification via Gemini 2.0 Flash (§9)
// Uses the new @google/genai SDK which supports AQ. format API keys
import { GoogleGenAI, Type } from '@google/genai';

const CATEGORIES = [
  'pothole', 'broken_footpath', 'damaged_road_divider', 'collapsed_culvert',
  'garbage_overflow', 'illegal_dumping', 'uncollected_trash', 'blocked_drain',
  'pipe_leak', 'contaminated_water', 'sewage_overflow', 'manhole_issue',
  'streetlight_outage', 'exposed_wiring', 'damaged_transformer',
  'broken_traffic_signal', 'faded_road_marking', 'illegal_parking'
];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: CATEGORIES
    },
    severity: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high']
    },
    confidence: {
      type: Type.NUMBER
    }
  },
  required: ['category', 'severity', 'confidence']
};

const CLASSIFICATION_PROMPT = `You are a civic infrastructure issue classifier for an Indian municipality.

Analyze this photo of a civic infrastructure problem and classify it.

Categories (choose exactly one):
- pothole: Holes or depressions in roads
- broken_footpath: Damaged pedestrian walkways
- damaged_road_divider: Broken or missing road dividers/medians
- collapsed_culvert: Collapsed drainage culverts
- garbage_overflow: Overflowing garbage bins or waste containers
- illegal_dumping: Unauthorized dumping of waste
- uncollected_trash: Trash not collected on schedule
- blocked_drain: Clogged or blocked drainage
- pipe_leak: Leaking water pipes
- contaminated_water: Contaminated or discolored water supply
- sewage_overflow: Sewage overflow into streets
- manhole_issue: Open, broken, or dangerous manholes
- streetlight_outage: Non-functional streetlights
- exposed_wiring: Exposed electrical wires
- damaged_transformer: Damaged electrical transformers
- broken_traffic_signal: Non-functional traffic signals
- faded_road_marking: Worn out road markings/lane lines
- illegal_parking: Vehicles parked illegally obstructing roads

Severity levels:
- low: Minor inconvenience, no immediate safety risk
- medium: Moderate impact, potential safety concern
- high: Immediate safety hazard, urgent attention needed

Confidence: A number between 0.0 and 1.0 indicating how confident you are in the classification.

Return your classification as JSON.`;

/**
 * Classify an image using Gemini 2.0 Flash
 * @param {string} imageUrl - URL of the image to classify
 * @returns {Promise<{category: string, severity: string, confidence: number}>}
 */
export const classifyImage = async (imageUrl, retries = 2) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { text: CLASSIFICATION_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const text = result.text;
    const classification = JSON.parse(text);

    // Validate category is in our enum
    if (!CATEGORIES.includes(classification.category)) {
      console.warn(`Gemini returned unexpected category: ${classification.category}, defaulting to pothole`);
      classification.category = 'pothole';
    }

    // Validate severity
    if (!['low', 'medium', 'high'].includes(classification.severity)) {
      classification.severity = 'medium';
    }

    // Clamp confidence
    classification.confidence = Math.max(0, Math.min(1, Number(classification.confidence) || 0.5));

    console.log(`AI classified: ${classification.category} (${classification.severity}) — confidence ${Math.round(classification.confidence * 100)}%`);
    return classification;
  } catch (error) {
    console.error('Gemini classification error:', error.message || error);
    if (error.status) console.error('Gemini status:', error.status);

    // Retry on rate limit (429)
    if (error.status === 429 && retries > 0) {
      const delay = (3 - retries) * 5000 + 2000;
      console.log(`Rate limited. Retrying in ${delay / 1000}s... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, delay));
      return classifyImage(imageUrl, retries - 1);
    }

    // Fallback per §6 — never crash the create flow
    return {
      category: 'pothole',
      severity: 'medium',
      confidence: 0
    };
  }
};
