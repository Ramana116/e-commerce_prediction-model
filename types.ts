export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  viewedProducts: string[];
  purchasedProducts: string[];
  demographics: {
    age: number;
    location: string;
  };
  timestamp: Date;
}

export interface AnalyzedReview {
  reviewText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  summary: string;
  analysis: AnalyzedReview[];
  keyTopics: {
    positive: string[];
    negative: string[];
  };
  sentimentTrend: {
    date: string;
    positivePercentage: number;
  }[];
}

export interface ForecastDataPoint {
  date: string;
  forecast: number;
}

export interface ProductForecastResult {
  forecast: ForecastDataPoint[];
  status: 'Healthy' | 'Watch' | 'Alert';
  recommendation: string;
  totalForecast: number;
}


export interface Activity {
  id: string;
  type: 'sale' | 'review' | 'view';
  description: string;
  timestamp: Date;
}

export interface RecommendationResult {
  productId: string;
  justification: string;
}