import { GoogleGenAI, Type } from "@google/genai";
import type { Review, Product, UserSession, Sale, RecommendationResult } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this example, we'll throw an error if the key is not set.
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const geminiFlash = 'gemini-2.5-flash';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Start of new Queueing and Retry Logic ---

// A queue to hold requests to be processed sequentially.
const apiRequestQueue: Array<() => Promise<void>> = [];
let isApiCallInFlight = false;

// Function to process the queue.
async function processApiRequestQueue() {
  if (isApiCallInFlight || apiRequestQueue.length === 0) {
    return;
  }
  isApiCallInFlight = true;

  const apiRequest = apiRequestQueue.shift();
  if (apiRequest) {
    try {
      await apiRequest();
    } catch (e) {
      // The error is already logged inside the request function,
      // so we just catch it here to prevent unhandled promise rejections.
      console.error("An error occurred during a queued API request.", e);
    }
  }

  // Add a 1-second delay between processing queued requests to respect rate limits.
  await delay(1000);

  isApiCallInFlight = false;
  // Process the next item in the queue.
  processApiRequestQueue();
}

/**
 * A robust wrapper for Gemini API calls that handles queueing, retries, and exponential backoff.
 * This function serializes all API requests across the application to prevent rate limiting.
 */
async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 5000 // Increased initial delay for more patient retries
): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const requestWithRetries = async () => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await apiCall();
          resolve(result);
          return; // Success, exit the retry loop
        } catch (error) {
          const errorString = JSON.stringify(error) || error.toString();
          const isRateLimitError = errorString.includes('429') || errorString.toLowerCase().includes('rate limit');

          if (isRateLimitError && attempt < maxRetries) {
            const waitTime = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`Gemini API rate limit hit. Retrying in ${waitTime / 1000}s... (Attempt ${attempt})`);
            await delay(waitTime);
          } else {
            console.error("Gemini API Error:", error);
            resolve(null); // Failure, exit loop
            return;
          }
        }
      }
      console.error("Gemini API call failed after max retries.");
      resolve(null); // Failure after all retries
    };
    
    // Add the request to the queue and start processing if not already running.
    apiRequestQueue.push(requestWithRetries);
    processApiRequestQueue();
  });
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

export const getRecommendations = async (
  userSession: UserSession,
  allProducts: Product[],
  allUserSessions: UserSession[],
  allSales: Sale[]
): Promise<RecommendationResult[] | null> => {
  return safeApiCall(async () => {
    const prompt = `
      You are an expert e-commerce recommendation engine. Your task is to provide highly personalized and context-aware product recommendations by analyzing user data and market trends.

      **1. Target User Profile:**
      - User ID: ${userSession.userId}
      - Demographics: Age ${userSession.demographics.age}, Location: ${userSession.demographics.location}
      - Viewed Product IDs: ${userSession.viewedProducts.join(', ') || 'None'}
      - Purchased Product IDs: ${userSession.purchasedProducts.join(', ') || 'None'}

      **2. Available Products (id, name, category):**
      ${allProducts.map(p => `- ${p.id}, ${p.name}, ${p.category}`).join('\n')}

      **3. Raw Data for Trend Analysis:**
      To identify trends, you must analyze the following raw data.
      - **Recent Sales Data (last 100 sales: {productId, quantity}):**
        ${JSON.stringify(allSales.slice(0, 100).map(s => ({ pId: s.productId, qty: s.quantity })))}
      - **Other User Profiles ({userId, demographics, purchasedProducts}):**
        ${JSON.stringify(allUserSessions.map(s => ({ uId: s.userId, demo: s.demographics, bought: s.purchasedProducts })))}

      **4. Your Task & Instructions:**
      Recommend exactly 3 products for the target user. Do not recommend products the user has already purchased. Your recommendations should be based on a synthesis of the following factors:
      - **Complementary Products:** Items that go well with the user's past purchases.
      - **Demographic Trends:** What products are popular with other users of a similar age (+/- 5 years) and the same location? Analyze the provided raw data to determine this.
      - **Overall Popularity:** What are the top-selling products overall from the recent sales data?

      **5. Output Format:**
      Return a JSON object. The object should have a "recommendations" key, which is an array of 3 recommendation objects. Each object must have a "productId" and a "justification". The justification must be a concise, single sentence explaining the *primary reason* for the recommendation (e.g., "Complements your purchase of Quantum Laptop.", "Trending among users in Tokyo.", "A top-selling product you might like.").
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
              description: "An array of 3 recommended products with justifications.",
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING, description: "The ID of the recommended product." },
                  justification: { type: Type.STRING, description: "A brief reason for recommending this product." }
                },
                required: ["productId", "justification"],
              }
            }
          },
          required: ["recommendations"],
        }
      }
    });

    const result = JSON.parse(response.text);
    return result.recommendations;
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