import { GoogleGenAI, Type } from "@google/genai";
import type { Review, Product, UserSession, Sale, RecommendationResult, ProductForecastResult } from '../types';

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

  // Add a 2-second delay between processing queued requests to respect rate limits.
  await delay(2000);

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
  initialDelay = 10000 // Increased initial delay for more patient retries
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


export const analyzeSentiment = async (reviews: Review[], product?: Product) => {
  return safeApiCall(async () => {
    if (reviews.length === 0) return null;

    const productContext = product
      ? `\n**Context: Product Analysis**
      These reviews are specifically for the product: "${product.name}". Tailor your summary and key topic extraction to be specific to this product. For example, instead of "good battery life", say "long battery life on the ${product.name}".\n`
      : '';

    const prompt = `
      You are a sentiment analysis expert for an e-commerce platform.
      Analyze the sentiment of the following product reviews with a focus on actionable insights.
      ${productContext}
      **1. Detailed Analysis:**
      - For each review, classify it as 'positive', 'neutral', or 'negative'.
      - Provide a total count for each sentiment category.
      - Write a brief, actionable summary (2-3 sentences) of the overall customer feedback.

      **2. Key Topic Extraction:**
      - Identify and extract the top 5 recurring positive keywords or short phrases (e.g., "fast shipping", "great battery life").
      - Identify and extract the top 5 recurring negative keywords or short phrases (e.g., "too expensive", "poor quality").

      **3. Trend Simulation:**
      - Based on the overall sentiment distribution in this batch of reviews, generate a plausible 14-day trend line. This should be an array of 14 objects, each with a "date" (e.g., "Day 1", "Day 2") and a "positivePercentage" (a number between 0 and 100). The trend should reflect the sentiment mix (e.g., if sentiment is mostly positive, the trend should generally be high or increasing).

      **Reviews to analyze:**
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
            positive: { type: Type.INTEGER },
            neutral: { type: Type.INTEGER },
            negative: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            analysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  reviewText: { type: Type.STRING },
                  sentiment: { type: Type.STRING }
                }
              }
            },
            keyTopics: {
                type: Type.OBJECT,
                properties: {
                    positive: { type: Type.ARRAY, items: { type: Type.STRING } },
                    negative: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            sentimentTrend: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        positivePercentage: { type: Type.NUMBER }
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
      You are an expert e-commerce recommendation engine. Your task is to provide highly personalized, diverse, and context-aware product recommendations by analyzing user data and market trends.

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
      Recommend exactly 3 products for the target user. Do not recommend products the user has already purchased. Your recommendations should be based on a synthesis of the following factors, with a strong emphasis on diversity:
      - **Complementary Products:** Items that go well with the user's past purchases.
      - **Demographic Trends:** What products are popular with other users of a similar age (+/- 5 years) and the same location? Analyze the provided raw data to determine this.
      - **Overall Popularity:** What are the top-selling products overall from the recent sales data?
      - **CRITICAL: Prioritize Diversity:** The 3 recommended products should ideally be from different product categories. For instance, after recommending a laptop, suggest items from distinct categories like 'Wearables' or 'Smart Home' instead of another computer or a closely related accessory. The goal is to broaden the user's discovery of your product range.

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

export const forecastProductDemand = async (product: Product, salesData: Sale[]): Promise<ProductForecastResult | null> => {
    return safeApiCall(async () => {
        if (salesData.length < 2) {
            // Not enough data for a meaningful forecast
            return {
                forecast: [],
                status: 'Watch',
                recommendation: 'Not enough historical sales data for an accurate forecast.',
                totalForecast: 0
            };
        }

        const monthlySales: {[key: string]: number} = {};
        salesData.forEach(sale => {
            const month = sale.timestamp.toISOString().substring(0, 7); // YYYY-MM
            if (!monthlySales[month]) {
                monthlySales[month] = 0;
            }
            monthlySales[month] += sale.quantity;
        });

        const prompt = `
            You are an inventory management and demand forecasting AI.
            
            **Product Details:**
            - Name: ${product.name}
            - Current Stock: ${product.stock} units

            **Historical Monthly Sales Data:**
            ${Object.entries(monthlySales).map(([month, quantity]) => `- ${month}: ${quantity} units`).join('\n')}
            
            **Your Tasks:**
            1.  **Forecast Demand:** Forecast the total sales quantity for the next 3 months. Provide a month-by-month breakdown.
            2.  **Analyze Stock:** Compare the total 3-month forecasted demand against the current stock level.
            3.  **Determine Status:** Classify the current inventory status as one of the following: 'Healthy', 'Watch', or 'Alert'.
                - 'Healthy': Stock is comfortably above the 3-month forecast.
                - 'Watch': Stock is close to or slightly below the 3-month forecast.
                - 'Alert': Stock is significantly below the 3-month forecast, risking a stockout.
            4.  **Provide Recommendation:** Write a concise, one-sentence recommendation. If the status is 'Alert' or 'Watch', suggest a specific number of units to reorder to meet the forecasted demand plus a 20% safety buffer.

            Provide the output in the specified JSON format.
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
                                    month: { type: Type.STRING },
                                    predictedSales: { type: Type.INTEGER }
                                }
                            }
                        },
                        status: { type: Type.STRING },
                        recommendation: { type: Type.STRING }
                    }
                }
            }
        });

        const result = JSON.parse(response.text);
        const transformedForecast = result.forecast.map((f: { month: string; predictedSales: number }) => ({ date: f.month, forecast: f.predictedSales }));
        const totalForecast = transformedForecast.reduce((sum: number, item: { forecast: number }) => sum + item.forecast, 0);

        return {
          forecast: transformedForecast,
          status: result.status,
          recommendation: result.recommendation,
          totalForecast
        };
    });
};