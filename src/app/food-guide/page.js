export default function FoodGuide() {
  const foodCategories = [
    {
      icon: '🥛',
      title: 'Dairy Products',
      description: 'Milk, cheese, yogurt, and other dairy items can be problematic for some people with IBD.',
      examples: ['Milk', 'Cheese', 'Yogurt', 'Ice cream', 'Butter', 'Cream']
    },
    {
      icon: '🌾',
      title: 'Gluten & Grains',
      description: 'Wheat, barley, rye and other grains containing gluten may cause digestive issues.',
      examples: ['Bread', 'Pasta', 'Cereal', 'Oats', 'Rice', 'Quinoa']
    },
    {
      icon: '🥩',
      title: 'High-Fat Foods',
      description: 'Fatty foods can be harder to digest and may trigger symptoms in some individuals.',
      examples: ['Fried foods', 'Red meat', 'Nuts', 'Avocado', 'Olive oil', 'Fatty fish']
    },
    {
      icon: '🍬',
      title: 'Processed Foods',
      description: 'Highly processed foods often contain additives and preservatives that can irritate the digestive system.',
      examples: ['Fast food', 'Chips', 'Candy', 'Frozen meals', 'Canned foods', 'Sausages']
    },
    {
      icon: '🌶️',
      title: 'Spicy Foods',
      description: 'Spices and hot foods can irritate the digestive tract and worsen symptoms.',
      examples: ['Chili peppers', 'Curry', 'Hot sauce', 'Pepper', 'Garlic', 'Onions']
    },
    {
      icon: '🥬',
      title: 'High-Fiber Foods',
      description: 'While fiber is generally healthy, high-fiber foods can be difficult to digest during flare-ups.',
      examples: ['Raw vegetables', 'Whole grains', 'Beans', 'Lentils', 'Nuts', 'Seeds']
    },
    {
      icon: '☕',
      title: 'Caffeine',
      description: 'Caffeine can stimulate the digestive system and may increase bowel movements.',
      examples: ['Coffee', 'Tea', 'Energy drinks', 'Chocolate', 'Soda', 'Pre-workout']
    },
    {
      icon: '🍺',
      title: 'Alcohol',
      description: 'Alcohol can irritate the digestive system and may interfere with medication absorption.',
      examples: ['Beer', 'Wine', 'Spirits', 'Cocktails', 'Liqueurs', 'Alcoholic mixers']
    }
  ]

  return (
    <div className="min-h-screen">
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">
              Food Categories
            </h1>
            <p className="text-lg text-gray-600 font-roboto max-w-2xl mx-auto">
              Understanding different food categories can help you make informed choices about your diet. 
              Remember, everyone's triggers are different - what affects one person may not affect another.
            </p>
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-roboto">
                <strong>Important:</strong> This is general information only. Always consult with your healthcare provider 
                or dietitian for personalized dietary advice.
              </p>
            </div>
          </div>

          {/* Food Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {foodCategories.map((category, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div>
                  <h3 className="text-xl font-semibold font-source text-gray-900 mb-2 flex items-center">
                    <span className="text-2xl sm:text-3xl mr-3">{category.icon}</span>
                    {category.title}
                  </h3>
                    <p className="text-gray-600 font-roboto mb-4">
                      {category.description}
                    </p>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Common examples:</h4>
                      <div className="flex flex-wrap gap-2">
                        {category.examples.map((example, idx) => (
                          <span 
                            key={idx}
                            className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-roboto"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-semibold font-source text-gray-900 mb-4">
              💡 Helpful Tips
            </h2>
            <ul className="space-y-2 text-gray-700 font-roboto">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                Keep a food diary to identify your personal triggers
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                Introduce new foods gradually, one at a time
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                Cook vegetables instead of eating them raw during flare-ups
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                Stay hydrated and maintain a balanced diet when possible
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                Work with a registered dietitian for personalized guidance
              </li>
            </ul>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-gradient-to-r from-blue-500 to-green-500 rounded-xl p-8 text-white">
            <h2 className="text-2xl font-semibold font-source mb-4">
              Ready to track your food intake?
            </h2>
            <p className="text-blue-100 font-roboto mb-6">
              Start logging your meals and symptoms to identify patterns and triggers that are unique to you.
            </p>
            <a 
              href="/auth"
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Get Started
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
