
import { GoogleGenAI, Type } from "@google/genai";
import type { Review, Product, UserSession, Sale } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this example, we'll throw an error if the key is not set.
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const geminiFlash = 'gemini-2.5-flash';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility to handle API call with retries and exponential backoff
async function safeApiCall<T,>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const errorString = JSON.stringify(error) || error.toString();
      const isRateLimitError = errorString.includes('429') || errorString.toLowerCase().includes('rate limit');

      if (isRateLimitError && attempt < maxRetries) {
        const waitTime = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`Gemini API rate limit hit. Retrying in ${waitTime / 1000}s... (Attempt ${attempt})`);
        await delay(waitTime);
      } else {
        console.error("Gemini API Error:", error);
        return null; 
      }
    }
  }
  console.error("Gemini API call failed after max retries.");
  return null;
}


export const analyzeSentiment = async (reviews: Review[]) => {
  return safeApiCall(async () => {
    if (reviews.length === 0) return null;

    const prompt = `
      Analyze the sentiment of the following e-commerce product reviews.
      For each review, classify it as 'positive', 'neutral', or 'negative'.
      Return an array of objects, where each object contains the original review text and its classification.
      Finally, provide a total count for each sentiment category and a brief, actionable summary (2-3 sentences) of the overall customer feedback.

      Reviews to analyze:
      ${reviews.map(r => `- "${r.text}"`).join('\n')}
    `;

    const response = await ai.models.generateContent({
      model: geminiFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            positive: { type: Type.INTEGER, description: "Total count of positive reviews." },
            neutral: { type: Type.INTEGER, description: "Total count of neutral reviews." },
            negative: { type: Type.INTEGER, description: "Total count of negative reviews." },
            summary: { type: Type.STRING, description: "Actionable summary of feedback." },
            analysis: {
              type: Type.ARRAY,
              description: "An array containing the sentiment analysis for each individual review.",
              items: {
                type: Type.OBJECT,
                properties: {
                  reviewText: { type: Type.STRING, description: "The original text of the review." },
                  sentiment: { type: Type.STRING, description: "The classified sentiment: 'positive', 'neutral', or 'negative'." }
                }
              }
            }
          },
        },
      },
    });
    
    return JSON.parse(response.text);
  });
};

export const getRecommendations = async (userSession: UserSession, allProducts: Product[]) => {
  return safeApiCall(async () => {
    const prompt = `
      Based on the following user session data, recommend 3 products from the provided product list.
      The user has already viewed or purchased some items, so recommend complementary or new products they might like.
      Do not recommend products the user has already purchased.

      User Session:
      - Viewed Products IDs: ${userSession.viewedProducts.join(', ')}
      - Purchased Products IDs: ${userSession.purchasedProducts.join(', ')}
      - Demographics: Age ${userSession.demographics.age}, Location: ${userSession.demographics.location}

      Available Products (id, name, category):
      ${allProducts.map(p => `- ${p.id}, ${p.name}, ${p.category}`).join('\n')}

      Return only the product IDs of your top 3 recommendations.
    `;
    
    const response = await ai.models.generateContent({
      model: geminiFlash,
      contents: prompt,
       config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: "An array of recommended product IDs.",
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    return result.recommendations as string[];
  });
};

export const getOptimalPrice = async (product: Product, competitorPrices: number[], demandSignal: 'High' | 'Medium' | 'Low') => {
  return safeApiCall(async () => {
    const prompt = `
      Calculate an optimal price for the following product based on market data.
      The price should be competitive but maximize profit.

      Product Details:
      - Name: ${product.name}
      - Current Price: $${product.price.toFixed(2)}
      - Current Stock: ${product.stock} units
      - Category: ${product.category}

      Market Data:
      - Competitor Prices: ${competitorPrices.map(p => `$${p.toFixed(2)}`).join(', ')}
      - Current Demand Signal: ${demandSignal}

      Provide the optimal price and a brief (1-2 sentences) justification for your suggestion.
    `;
    
    const response = await ai.models.generateContent({
      model: geminiFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                optimalPrice: { type: Type.NUMBER, description: "The suggested optimal price." },
                justification: { type: Type.STRING, description: "A brief reason for the price suggestion." }
            }
        }
      }
    });

    return JSON.parse(response.text);
  });
};

export const forecastDemand = async (salesData: Sale[]) => {
    return safeApiCall(async () => {
        if (salesData.length < 5) return null;

        const monthlySales: {[key: string]: number} = {};
        salesData.forEach(sale => {
            const month = sale.timestamp.toISOString().substring(0, 7); // YYYY-MM
            if (!monthlySales[month]) {
                monthlySales[month] = 0;
            }
            monthlySales[month] += sale.quantity;
        });

        const prompt = `
            Given the following monthly sales data for a product line, forecast the total sales quantity for the next 3 months.
            Analyze trends and seasonality in the data to make your prediction.

            Historical Monthly Sales Data:
            ${Object.entries(monthlySales).map(([month, quantity]) => `- ${month}: ${quantity} units`).join('\n')}
            
            Provide the forecast for the next 3 months.
        `;

        const response = await ai.models.generateContent({
            model: geminiFlash,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        forecast: {
                            type: Type.ARRAY,
                            description: "An array of forecast data points for the next 3 months.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    month: { type: Type.STRING, description: "The forecasted month (e.g., 'YYYY-MM')." },
                                    predictedSales: { type: Type.INTEGER, description: "The predicted sales quantity." }
                                }
                            }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(response.text);
        return result.forecast.map((f: { month: string; predictedSales: number }) => ({ date: f.month, forecast: f.predictedSales }));
    });
};
