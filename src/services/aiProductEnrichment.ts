import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface ProductData {
  name: string;
  description: string;
  category: string;
  specifications?: Record<string, any>;
}

interface EnrichedProduct {
  qualityScore: number;
  keywords: string[];
  marketAppeal: string;
  targetBuyers: string[];
  competitiveAdvantage: string;
  pricingRecommendation: string;
  improvementSuggestions: string[];
  crossSellProducts: string[];
  upSellProducts: string[];
}

export async function enrichProductWithAI(product: ProductData): Promise<EnrichedProduct | null> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return null;
    }

    const prompt = `
Analyze this B2B product and provide enrichment insights:

Product Name: ${product.name}
Category: ${product.category}
Description: ${product.description}
Specifications: ${JSON.stringify(product.specifications || {})}

Return a JSON response (no markdown, just valid JSON) with:
{
  "qualityScore": number 0-100,
  "keywords": ["array", "of", "relevant", "keywords"],
  "marketAppeal": "description of market appeal",
  "targetBuyers": ["buyer1", "buyer2", "buyer3"],
  "competitiveAdvantage": "key strength vs competitors",
  "pricingRecommendation": "competitive pricing insight",
  "improvementSuggestions": ["improvement1", "improvement2"],
  "crossSellProducts": ["product1", "product2"],
  "upSellProducts": ["premium product1", "premium product2"]
}

Be concise and practical for B2B procurement.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a B2B product analyst. Provide practical insights for procurement platforms. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      console.error('No response from OpenAI');
      return null;
    }

    const enrichedData: EnrichedProduct = JSON.parse(content);
    return enrichedData;
  } catch (error) {
    console.error('Error enriching product:', error);
    return null;
  }
}

export async function generateProductEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!OPENAI_API_KEY) {
      return null;
    }

    // Using OpenAI's text-embedding-3-small for semantic search
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-3-small',
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const embedding = response.data.data[0]?.embedding;
    return embedding || null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function findSimilarProducts(
  productEmbedding: number[],
  otherProducts: Array<{ embedding: number[]; name: string; category: string }>
): Promise<Array<{ name: string; similarity: number; category: string }>> {
  return otherProducts
    .map(p => ({
      name: p.name,
      category: p.category,
      similarity: calculateCosineSimilarity(productEmbedding, p.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

export async function scoreLeadQuality(
  buyerBehavior: {
    searchKeywords: string[];
    viewedProducts: string[];
    timeOnPlatform: number;
    inquiriesCount: number;
  }
): Promise<{
  leadScore: number;
  confidence: string;
  recommendations: string[];
}> {
  try {
    if (!OPENAI_API_KEY) {
      return {
        leadScore: 0,
        confidence: 'low',
        recommendations: [],
      };
    }

    const prompt = `
Score this B2B buyer lead quality:

Search Keywords: ${buyerBehavior.searchKeywords.join(', ')}
Viewed Products: ${buyerBehavior.viewedProducts.length}
Time on Platform: ${buyerBehavior.timeOnPlatform}min
Inquiries Made: ${buyerBehavior.inquiriesCount}

Return JSON (no markdown):
{
  "leadScore": number 0-100,
  "confidence": "high/medium/low",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a B2B lead scoring expert. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) return { leadScore: 0, confidence: 'low', recommendations: [] };

    return JSON.parse(content);
  } catch (error) {
    console.error('Error scoring lead:', error);
    return { leadScore: 0, confidence: 'low', recommendations: [] };
  }
}
