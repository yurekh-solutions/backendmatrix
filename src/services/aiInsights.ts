import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface SupplierData {
  supplierId: string;
  companyName: string;
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  successRate: number;
  categories: Record<string, number>;
  memberSince?: string;
  businessType?: string;
}

interface AIInsights {
  demographics: {
    supplierType: string;
    businessSize: string;
    maturityLevel: string;
  };
  predictions: {
    nextMonthTrend: string;
    likelyGrowth: number;
    riskFactors: string[];
  };
  recommendations: {
    improvements: string[];
    opportunities: string[];
    warnings: string[];
  };
  businessImpact: {
    estimatedRevenuePotential: string;
    marketPosition: string;
    competitiveAdvantage: string;
  };
}

export async function generateSupplierInsights(supplierData: SupplierData): Promise<AIInsights | null> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return null;
    }

    const prompt = `
Analyze the following supplier data and provide business insights:

Company: ${supplierData.companyName}
Total Products: ${supplierData.totalProducts}
Active Products: ${supplierData.activeProducts}
Pending Products: ${supplierData.pendingProducts}
Rejected Products: ${supplierData.rejectedProducts}
Success Rate: ${supplierData.successRate}%
Categories: ${JSON.stringify(supplierData.categories)}
Member Since: ${supplierData.memberSince || '2024'}
Business Type: ${supplierData.businessType || 'General Supplier'}

Please provide a JSON response with the following structure (no markdown, just valid JSON):
{
  "demographics": {
    "supplierType": "string describing type of supplier",
    "businessSize": "small/medium/large based on product count",
    "maturityLevel": "startup/growing/established/leader"
  },
  "predictions": {
    "nextMonthTrend": "string describing expected trend",
    "likelyGrowth": number between 0-100 representing growth percentage,
    "riskFactors": ["array of potential risks"]
  },
  "recommendations": {
    "improvements": ["specific actions to improve"],
    "opportunities": ["market opportunities"],
    "warnings": ["critical issues to address"]
  },
  "businessImpact": {
    "estimatedRevenuePotential": "string describing revenue potential",
    "marketPosition": "current market position",
    "competitiveAdvantage": "key competitive strengths"
  }
}

Be concise and practical. Focus on actionable insights.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst specializing in B2B supplier analysis. Provide practical, actionable insights based on supplier data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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

    const insights: AIInsights = JSON.parse(content);
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return null;
  }
}

export async function generateProductRecommendations(
  supplierData: SupplierData,
  topCategory: string
): Promise<string[] | null> {
  try {
    if (!OPENAI_API_KEY) {
      return null;
    }

    const prompt = `
Based on this supplier's profile:
- Company: ${supplierData.companyName}
- Success Rate: ${supplierData.successRate}%
- Top Category: ${topCategory}
- Active Products: ${supplierData.activeProducts}

Generate 3-4 specific product or strategy recommendations to improve their business. Be concise and practical.
Return only a JSON array of strings, no markdown or explanation.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a business strategist. Provide practical recommendations. Return ONLY a valid JSON array of strings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
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
    if (!content) return null;

    const recommendations = JSON.parse(content);
    return Array.isArray(recommendations) ? recommendations : null;
  } catch (error) {
    console.error('Error generating product recommendations:', error);
    return null;
  }
}
