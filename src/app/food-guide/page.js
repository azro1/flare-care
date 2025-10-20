'use client'

import Link from 'next/link'

export default function FoodGuide() {
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
    <div className="bg-gray-50">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:justify-center">
          
          {/* Main Content */}
          <div className="flex-1 lg:max-w-4xl order-1 lg:order-2">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">
            Food Guide
          </h1>
          <p className="text-gray-600 font-roboto break-words">
            Understanding different food categories can help you make informed choices about your diet. This reference guide provides an overview of common food groups and their nutritional properties.
          </p>
        </div>

        {/* Warning Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <p className="text-yellow-800 font-roboto leading-relaxed">
            <span className="font-semibold">Note:</span> This is a general food reference guide. Always follow the specific dietary advice provided by your doctor or registered dietitian.
          </p>
        </div>

        {/* Food Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {categories.map((category, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{category.emoji}</span>
                <h2 className="text-xl font-semibold font-source text-gray-900">{category.title}</h2>
              </div>
              <p className="text-gray-600 font-roboto mb-4 leading-relaxed">{category.description}</p>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Examples:</h3>
                <div className="flex flex-wrap gap-2">
                  {category.examples.map((example, i) => (
                    <span 
                      key={i} 
                      className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-roboto"
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold font-source text-blue-900 mb-4">💡 Helpful Tips</h2>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="text-blue-800 font-roboto leading-relaxed flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

          </div>

          {/* Left Sidebar */}
          <div className="lg:w-96 lg:flex-shrink-0 order-2 lg:order-1">
            <div className="sticky top-8 space-y-6">
              
              {/* Quick Food Tips */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold font-source text-gray-900 mb-4">Quick Food Tips</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Keep a food diary to track triggers</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Stay hydrated throughout the day</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Eat smaller, frequent meals</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Follow your healthcare team's advice</p>
                  </div>
                </div>
              </div>

              {/* IBD-Friendly Foods */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold font-source text-gray-900 mb-4">IBD-Friendly Foods</h3>
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-1">✅ Generally Safe</h4>
                    <p className="text-sm text-green-700">Bananas, rice, applesauce, toast, oatmeal, lean proteins</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-1">⚠️ Try Carefully</h4>
                    <p className="text-sm text-yellow-700">Dairy, high-fiber foods, spicy foods, raw vegetables</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-1">❌ Avoid During Flares</h4>
                    <p className="text-sm text-red-700">Nuts, seeds, popcorn, alcohol, caffeine, fried foods</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Call to Action - Full Width */}
      <div className="mt-8">
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">Track Your Meals</h2>
          <p className="text-gray-600 font-roboto mb-6 leading-relaxed">
            Use the symptom tracker to log what you eat each day and monitor how different foods affect you.
          </p>
          <Link 
            href="/symptoms"
            className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Start Tracking
          </Link>
        </div>
      </div>
    </div>
  )
}