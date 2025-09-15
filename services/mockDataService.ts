
import type { Review, Product, Sale, UserSession, Activity } from '../types';

const PRODUCT_NAMES = [
  "Quantum Laptop", "Nebula Smartwatch", "Fusion Wireless Buds", "Aura VR Headset", "Photon Tablet",
  "Nova Gaming Mouse", "Orion Mechanical Keyboard", "Echo Smart Speaker", "Pulse Fitness Tracker", "Vertex Drone"
];
const CATEGORIES = ["Electronics", "Gaming", "Wearables", "Smart Home", "Accessories"];
const LOCATIONS = ["New York", "London", "Tokyo", "Sydney", "Berlin"];

const generateProducts = (count: number): Product[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `P${1000 + i}`,
    name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
    category: CATEGORIES[i % CATEGORIES.length],
    price: parseFloat((Math.random() * (1500 - 50) + 50).toFixed(2)),
    stock: Math.floor(Math.random() * 200),
  }));
};

const generateReviews = (products: Product[], count: number): Review[] => {
  const reviewTexts = [
    "Absolutely fantastic product! Exceeded all my expectations.",
    "It's okay, does the job but nothing special.",
    "I'm very disappointed with the quality, broke after a week.",
    "Good value for the price. I would recommend it.",
    "The user interface is a bit clunky but the hardware is solid.",
    "Customer service was amazing when I had an issue.",
    "Not what I expected. The description was misleading.",
    "A must-have for anyone in the market for this type of device.",
    "Battery life is shorter than advertised.",
    "Sleek design and works perfectly."
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `R${2000 + i}`,
    productId: products[Math.floor(Math.random() * products.length)].id,
    userId: `U${3000 + Math.floor(Math.random() * 50)}`,
    rating: Math.floor(Math.random() * 5) + 1,
    text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
  }));
};

const generateSales = (products: Product[], count: number): Sale[] => {
  return Array.from({ length: count }, (_, i) => {
    const product = products[Math.floor(Math.random() * products.length)];
    return {
      id: `S${4000 + i}`,
      productId: product.id,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: product.price,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
    };
  });
};

const generateUserSessions = (products: Product[], count: number): UserSession[] => {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: `SES${5000 + i}`,
    userId: `U${3000 + i}`,
    viewedProducts: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => products[Math.floor(Math.random() * products.length)].id),
    purchasedProducts: Array.from({ length: Math.floor(Math.random() * 2) }, () => products[Math.floor(Math.random() * products.length)].id),
    demographics: {
      age: Math.floor(Math.random() * (65 - 18) + 18),
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    },
  }));
};

let products = generateProducts(10);
let reviews = generateReviews(products, 50);
let sales = generateSales(products, 100);
let userSessions = generateUserSessions(products, 50);

const getUpdatedData = () => {
    // Simulate a new event
    const product = products[Math.floor(Math.random() * products.length)];
    const eventType = Math.random();
    let activity: Activity;

    if (eventType < 0.5) { // New Sale
        const newSale = {
            id: `S${Date.now()}`,
            productId: product.id,
            quantity: 1,
            price: product.price,
            timestamp: new Date(),
        };
        sales = [newSale, ...sales].slice(0, 200);
        activity = { id: newSale.id, type: 'sale', description: `Sale of ${product.name}`, timestamp: new Date() };
    } else if (eventType < 0.8) { // New Review
        const newReview = {
            id: `R${Date.now()}`,
            productId: product.id,
            userId: `U${3000 + Math.floor(Math.random() * 50)}`,
            rating: Math.floor(Math.random() * 5) + 1,
            text: "This is a new real-time review!",
        };
        reviews = [newReview, ...reviews].slice(0, 100);
         activity = { id: newReview.id, type: 'review', description: `New review for ${product.name}`, timestamp: new Date() };
    } else { // New View
        const user = userSessions[Math.floor(Math.random() * userSessions.length)];
        user.viewedProducts.push(product.id);
        activity = { id: `V${Date.now()}`, type: 'view', description: `User ${user.userId} viewed ${product.name}`, timestamp: new Date() };
    }
    
    // Update stock levels
    products = products.map(p => ({ ...p, stock: Math.max(0, p.stock - (Math.random() > 0.95 ? 1 : 0)) }));

    return { reviews, products, sales, userSessions, activity };
};

export const mockDataService = {
  getUpdatedData
};
