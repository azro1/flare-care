/** Nutrition guide — reference content ported from web Foods page. */

export type NutritionCategory = {
  title: string;
  description: string;
  examples: string[];
};

export const NUTRITION_GUIDE_INTRO =
  "Learn about different food categories and their nutritional properties to help you make informed choices about your diet.";

export const NUTRITION_CATEGORIES: NutritionCategory[] = [
  {
    title: "Protein",
    description:
      "Essential for building and repairing tissues, making enzymes and hormones. Found in both animal and plant sources.",
    examples: [
      "Meat",
      "Poultry",
      "Fish",
      "Eggs",
      "Dairy products",
      "Beans",
      "Lentils",
      "Tofu",
      "Nuts",
      "Seeds",
    ],
  },
  {
    title: "Carbohydrates",
    description: "The body's main source of energy. Includes simple sugars and complex starches.",
    examples: [
      "Bread",
      "Rice",
      "Pasta",
      "Potatoes",
      "Oats",
      "Quinoa",
      "Cereals",
      "Fruits",
      "Vegetables",
    ],
  },
  {
    title: "Fats & Oils",
    description: "Essential for energy, cell function, and absorption of vitamins A, D, E, and K.",
    examples: [
      "Olive oil",
      "Butter",
      "Avocado",
      "Nuts",
      "Seeds",
      "Fatty fish",
      "Coconut oil",
      "Nut butters",
    ],
  },
  {
    title: "Fiber",
    description: "Helps with digestion and maintaining healthy bowel movements. Found in plant-based foods.",
    examples: [
      "Whole grains",
      "Vegetables",
      "Fruits",
      "Beans",
      "Lentils",
      "Nuts",
      "Seeds",
      "Oats",
      "Bran",
    ],
  },
  {
    title: "Dairy & Calcium Sources",
    description: "Rich in calcium, vitamin D, and protein. Important for bone health.",
    examples: [
      "Milk",
      "Cheese",
      "Yogurt",
      "Kefir",
      "Fortified plant milks",
      "Leafy greens",
      "Fortified juices",
    ],
  },
  {
    title: "Fruits & Vegetables",
    description: "Rich in vitamins, minerals, antioxidants, and fiber. Provide a wide range of nutrients.",
    examples: [
      "Leafy greens",
      "Berries",
      "Citrus fruits",
      "Carrots",
      "Broccoli",
      "Apples",
      "Bananas",
      "Peppers",
    ],
  },
  {
    title: "Gluten-Containing Foods",
    description: "Foods that contain the protein gluten, found in wheat, barley, and rye.",
    examples: [
      "Wheat bread",
      "Pasta",
      "Cereals",
      "Barley",
      "Rye",
      "Most baked goods",
      "Beer",
      "Some sauces",
    ],
  },
  {
    title: "Common Allergens",
    description: "Foods that commonly cause allergic reactions or sensitivities in some individuals.",
    examples: [
      "Peanuts",
      "Tree nuts",
      "Shellfish",
      "Fish",
      "Eggs",
      "Milk",
      "Soy",
      "Wheat",
      "Sesame",
    ],
  },
  {
    title: "Added Sugars",
    description: "Sugars and sweeteners added to foods and beverages during processing or preparation.",
    examples: [
      "Table sugar",
      "Honey",
      "Syrups",
      "Candy",
      "Sodas",
      "Pastries",
      "Sweetened drinks",
    ],
  },
  {
    title: "High-Sodium Foods",
    description:
      "Foods high in salt content. Important to monitor for those managing blood pressure or fluid retention.",
    examples: [
      "Processed meats",
      "Canned soups",
      "Salty snacks",
      "Fast food",
      "Pickles",
      "Soy sauce",
      "Cheese",
    ],
  },
];

export const NUTRITION_HELPFUL_TIPS = [
  "Use this reference when your doctor or dietitian recommends avoiding specific food categories",
  "Keep a food diary to track which foods you eat and any symptoms you experience",
  "Always follow the specific dietary advice given to you by your healthcare team",
  "If you need to eliminate a food group, consult with a dietitian to ensure adequate nutrition",
  "Food sensitivities and requirements can change over time — regular check-ins are important",
];

export const NUTRITION_IBD_SAFE =
  "Bananas, rice, applesauce, toast, oatmeal, lean proteins";
export const NUTRITION_IBD_CAREFUL = "Dairy, high-fiber foods, spicy foods, raw vegetables";
export const NUTRITION_IBD_AVOID_FLARE = "Nuts, seeds, popcorn, alcohol, caffeine, fried foods";

export const NUTRITION_QUICK_TIPS = [
  "Pair carbs with protein to steady energy",
  "Keep simple foods ready for flare days",
  "Freeze single portions for low-energy days",
  "Note any new foods and how your gut reacts",
];

export const NUTRITION_GUIDE_NOTE =
  "This is a general food reference guide. Always follow the specific dietary advice provided by your doctor or registered dietitian.";
