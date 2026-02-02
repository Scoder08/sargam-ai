import { useState } from 'react';
import { Link } from 'react-router-dom';

const gemPacks = [
  { id: 'starter', gems: 500, price: 79, popular: false },
  { id: 'popular', gems: 1500, price: 199, popular: true, bonus: 200 },
  { id: 'pro', gems: 5000, price: 499, popular: false, bonus: 1000 },
  { id: 'ultimate', gems: 15000, price: 999, popular: false, bonus: 5000 },
];

const premiumPlans = [
  { id: 'monthly', name: 'Monthly', price: 199, period: 'month', features: ['All songs unlocked', 'No ads', 'Streak freeze included'] },
  { id: 'yearly', name: 'Yearly', price: 1499, period: 'year', savings: '37%', features: ['All songs unlocked', 'No ads', '5 streak freezes/month', 'Early access to new songs'] },
];

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<'gems' | 'premium'>('gems');
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const userGems = 450; // Mock

  const handlePurchase = (packId: string) => {
    setSelectedPack(packId);
    setShowConfirm(true);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:ml-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Shop</h1>
        <div className="flex items-center gap-2 text-neutral-600">
          <span>💎</span>
          <span>Your balance: <strong className="text-neutral-900">{userGems}</strong> gems</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('gems')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'gems'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          💎 Gems
        </button>
        <button
          onClick={() => setActiveTab('premium')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'premium'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          ⭐ Premium
        </button>
      </div>

      {/* Gems Tab */}
      {activeTab === 'gems' && (
        <div className="space-y-4">
          {/* Free gems info */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Earn free gems!</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Complete daily goals: +5 gems</li>
              <li>• 7-day streak: +50 gems</li>
              <li>• Unlock achievements: +10-100 gems</li>
              <li>• Invite friends: +100 gems each</li>
            </ul>
          </div>

          {/* Gem Packs */}
          <div className="grid grid-cols-2 gap-3">
            {gemPacks.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handlePurchase(pack.id)}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                  pack.popular
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white hover:border-primary-300'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    BEST VALUE
                  </span>
                )}
                
                <div className="text-center">
                  <span className="text-3xl block mb-2">💎</span>
                  <p className="text-2xl font-bold text-neutral-900">
                    {pack.gems.toLocaleString()}
                  </p>
                  {pack.bonus && (
                    <p className="text-xs text-green-600 font-medium">
                      +{pack.bonus} bonus!
                    </p>
                  )}
                  <p className="text-lg font-semibold text-primary-600 mt-2">
                    ₹{pack.price}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Premium Tab */}
      {activeTab === 'premium' && (
        <div className="space-y-4">
          {/* Premium Benefits */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-lg text-neutral-900 mb-3 flex items-center gap-2">
              <span>⭐</span> Premium Benefits
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-neutral-700">
                <span className="text-green-500">✓</span>
                <span>Access all 50+ Bollywood songs</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-700">
                <span className="text-green-500">✓</span>
                <span>No advertisements</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-700">
                <span className="text-green-500">✓</span>
                <span>Streak freeze protection</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-700">
                <span className="text-green-500">✓</span>
                <span>Exclusive achievements</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-700">
                <span className="text-green-500">✓</span>
                <span>Early access to new content</span>
              </li>
            </ul>
          </div>

          {/* Plans */}
          <div className="space-y-3">
            {premiumPlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handlePurchase(plan.id)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                  plan.id === 'yearly'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-neutral-200 bg-white hover:border-primary-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-lg text-neutral-900">{plan.name}</span>
                    {plan.savings && (
                      <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Save {plan.savings}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">₹{plan.price}</p>
                    <p className="text-xs text-neutral-500">per {plan.period}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-neutral-500 text-center mt-4">
            Cancel anytime. Subscription auto-renews unless cancelled.
          </p>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showConfirm && selectedPack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-xl font-bold text-neutral-900 mb-4 text-center">
              Confirm Purchase
            </h3>
            
            <p className="text-center text-neutral-600 mb-6">
              This will open your payment app. Complete the payment to receive your gems.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // Handle payment (Razorpay/UPI)
                  alert('Payment integration coming soon!');
                  setShowConfirm(false);
                }}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
              >
                Pay Now
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 text-neutral-500 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
