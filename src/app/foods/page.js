'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { UtensilsCrossed, Soup, Snowflake, NotebookPen, CheckCircle, AlertTriangle, XCircle, Lightbulb } from 'lucide-react'

export default function Foods() {
  const { user } = useAuth()
  const categories = [
    {
      emoji: '🥩',
      title: 'Protein',
      description: 'Essential for building and repairing tissues, making enzymes and hormones. Found in both animal and plant sources.',
      examples: ['Meat', 'Poultry', 'Fish', 'Eggs', 'Dairy products', 'Beans', 'Lentils', 'Tofu', 'Nuts', 'Seeds']
    },
    {
      emoji: '🍞',
      title: 'Carbohydrates',
      description: 'The body\'s main source of energy. Includes simple sugars and complex starches.',
      examples: ['Bread', 'Rice', 'Pasta', 'Potatoes', 'Oats', 'Quinoa', 'Cereals', 'Fruits', 'Vegetables']
    },
    {
      emoji: '🥑',
      title: 'Fats & Oils',
      description: 'Essential for energy, cell function, and absorption of vitamins A, D, E, and K.',
      examples: ['Olive oil', 'Butter', 'Avocado', 'Nuts', 'Seeds', 'Fatty fish', 'Coconut oil', 'Nut butters']
    },
    {
      emoji: '🥬',
      title: 'Fiber',
      description: 'Helps with digestion and maintaining healthy bowel movements. Found in plant-based foods.',
      examples: ['Whole grains', 'Vegetables', 'Fruits', 'Beans', 'Lentils', 'Nuts', 'Seeds', 'Oats', 'Bran']
    },
    {
      emoji: '🥛',
      title: 'Dairy & Calcium Sources',
      description: 'Rich in calcium, vitamin D, and protein. Important for bone health.',
      examples: ['Milk', 'Cheese', 'Yogurt', 'Kefir', 'Fortified plant milks', 'Leafy greens', 'Fortified juices']
    },
    {
      emoji: '🍊',
      title: 'Fruits & Vegetables',
      description: 'Rich in vitamins, minerals, antioxidants, and fiber. Provide a wide range of nutrients.',
      examples: ['Leafy greens', 'Berries', 'Citrus fruits', 'Carrots', 'Broccoli', 'Apples', 'Bananas', 'Peppers']
    },
    {
      emoji: '🌾',
      title: 'Gluten-Containing Foods',
      description: 'Foods that contain the protein gluten, found in wheat, barley, and rye.',
      examples: ['Wheat bread', 'Pasta', 'Cereals', 'Barley', 'Rye', 'Most baked goods', 'Beer', 'Some sauces']
    },
    {
      emoji: '🥜',
      title: 'Common Allergens',
      description: 'Foods that commonly cause allergic reactions or sensitivities in some individuals.',
      examples: ['Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame']
    },
    {
      emoji: '🍬',
      title: 'Added Sugars',
      description: 'Sugars and sweeteners added to foods and beverages during processing or preparation.',
      examples: ['Table sugar', 'Honey', 'Syrups', 'Candy', 'Sodas', 'Pastries', 'Sweetened drinks']
    },
    {
      emoji: '🧂',
      title: 'High-Sodium Foods',
      description: 'Foods high in salt content. Important to monitor for those managing blood pressure or fluid retention.',
      examples: ['Processed meats', 'Canned soups', 'Salty snacks', 'Fast food', 'Pickles', 'Soy sauce', 'Cheese']
    }
  ]

  const tips = [
    'Use this reference when your doctor or dietitian recommends avoiding specific food categories',
    'Keep a food diary to track which foods you eat and any symptoms you experience',
    'Always follow the specific dietary advice given to you by your healthcare team',
    'If you need to eliminate a food group, consult with a dietitian to ensure adequate nutrition',
    'Food sensitivities and requirements can change over time - regular check-ins are important'
  ]

  return (
    <div>
      <div className="w-full sm:px-4 md:px-6">
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:justify-center">
          
          {/* Main Content */}
          <div className="flex-1 lg:max-w-4xl order-1 lg:order-2">
        {/* Header */}
        <div className="mb-5 sm:mb-6 card ">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">
            Foods
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-secondary font-roboto break-words leading-relaxed">
            Learn about different food categories and their nutritional properties to help you make informed choices about your diet
          </p>
        </div>

        {/* Food Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 sm:gap-6 sm:mb-6">
          {categories.map((category, index) => (
            <div key={index} className="card">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{category.emoji}</span>
                <h2 className="text-xl font-semibold font-source text-primary">{category.title}</h2>
              </div>
              <p className="text-sm sm:text-base text-secondary font-roboto mb-4 leading-relaxed">{category.description}</p>
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">Examples:</h3>
                <div className="flex flex-wrap gap-2">
                  {category.examples.map((example, i) => (
                    <span 
                      key={i} 
                      className="inline-block px-3 py-1 card-inner text-secondary text-sm rounded-full font-roboto"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips Card */}
        <div className="card backdrop-blur-sm mb-5 sm:mb-6">
          <h2 className="text-xl font-semibold font-source text-primary mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-white" />
            Helpful Tips
          </h2>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm sm:text-base text-secondary font-roboto leading-relaxed flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mr-3 mt-2 flex-shrink-0"></span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        

        

          </div>

          {/* Left Sidebar */}
          <div className="lg:w-72 lg:flex-shrink-0 order-2 lg:order-1 lg:mb-6">
            <div className="sticky top-6 space-y-5 sm:space-y-6">
              

              {/* IBD-Friendly Foods */}
              <div className="card">
                <h3 className="text-xl font-semibold font-source text-primary mb-4">IBD Foods</h3>
                <div className="space-y-4">
                  <div className="card-inner p-4">
                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-white flex-shrink-0" />
                      Generally Safe
                    </h4>
                    <p className="text-sm sm:text-base text-secondary">Bananas, rice, applesauce, toast, oatmeal, lean proteins</p>
                  </div>
                  <div className="card-inner p-4">
                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-white flex-shrink-0" />
                      Try Carefully
                    </h4>
                    <p className="text-sm sm:text-base text-secondary">Dairy, high-fiber foods, spicy foods, raw vegetables</p>
                  </div>
                  <div className="card-inner p-4">
                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500 dark:text-white flex-shrink-0" />
                      Avoid During Flares
                    </h4>
                    <p className="text-sm sm:text-base text-secondary">Nuts, seeds, popcorn, alcohol, caffeine, fried foods</p>
                  </div>
                </div>
              </div>

              {/* Quick Food Tips */}
              <div className="card p-4 sm:p-6">
                <h3 className="text-xl font-semibold font-source text-primary mb-4">Quick Food Tips</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                      <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-secondary">Pair carbs with protein to steady energy</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                      <Soup className="w-4 h-4 text-amber-600 dark:text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-secondary">Keep simple foods ready for flare days</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                      <Snowflake className="w-4 h-4 text-blue-500 dark:text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-secondary">Freeze single portions for low-energy days</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                      <NotebookPen className="w-4 h-4 text-indigo-400 dark:text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-secondary">Note any new foods and how your gut reacts</p>
                  </div>
                </div>
              </div>
              
              {/* Note */}
              <div className="card">
                <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
                  <span className="font-semibold">Note:</span> This is a general food reference guide. Always follow the specific dietary advice provided by your doctor or registered dietitian.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Call to Action - Combined width (sidebar + content) */}
      <div>
        <div className="mt-5 sm:mt-6 max-w-[76rem] mx-auto px-0 sm:px-4 md:px-6 lg:px-0 lg:mt-0">
          <div className="card p-8 backdrop-blur-sm text-center">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">Track Your Meals</h2>
          <p className="text-sm sm:text-base text-secondary font-roboto mb-6 leading-relaxed">
            Use the symptom tracker to log what you eat each day and monitor how different foods affect you.
          </p>
          <Link 
            href={user ? '/symptoms' : '/auth'}
            className="inline-block bg-[#5F9EA0] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#5F9EA0]/80 transition-colors duration-200"
          >
            Start Tracking
          </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

