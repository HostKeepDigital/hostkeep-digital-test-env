import { useState } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

export default function PricingAssistant({ propertyId, currentSettings, onApplyRecommendations }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [appliedChanges, setAppliedChanges] = useState({});

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getPricingRecommendations', {
        propertyId,
        currentSettings
      });

      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      } else {
        setError(response.data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Pricing recommendations error:', err);
      setError(err.message || 'Unable to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = (type, value) => {
    setAppliedChanges(prev => ({ ...prev, [type]: value }));
    if (onApplyRecommendations) {
      onApplyRecommendations(type, value);
    }
  };

  const applySurgeOpportunities = () => {
    if (!recommendations?.surgeOpportunities) return;

    const dateOverrides = { ...currentSettings?.date_overrides } || {};
    recommendations.surgeOpportunities.forEach(surge => {
      const [start, end] = surge.dateRange.split(' to ').map(d => d.trim());
      const startDate = new Date(start);
      const endDate = new Date(end);

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        dateOverrides[dateStr] = { rate: surge.rate };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    applyRecommendation('date_overrides', dateOverrides);
  };

  if (!recommendations) {
    return (
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Pricing Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Get AI-powered pricing recommendations based on booking trends, market data, and local demand patterns.
          </p>
          <Button
            onClick={fetchRecommendations}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Analyzing...' : 'Get Recommendations'}
          </Button>
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
              <strong>Error:</strong> {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Base Rate Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Base Rate Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Recommended Rate</p>
              <p className="text-3xl font-bold text-teal-600">
                £{recommendations.baseRateRecommendation.rate}
                <span className="text-lg text-gray-500">/night</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">{recommendations.baseRateRecommendation.explanation}</p>
            </div>
            <Button
              variant={appliedChanges.baseRate ? 'default' : 'outline'}
              onClick={() => applyRecommendation('baseRate', recommendations.baseRateRecommendation.rate)}
              className="gap-2"
            >
              {appliedChanges.baseRate ? <Check className="w-4 h-4" /> : 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Peak Season Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Peak Season Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rate</p>
              <p className="text-2xl font-bold">£{recommendations.peakSeasonRate.rate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Dates</p>
              <p className="text-sm font-semibold">{recommendations.peakSeasonRate.dates}</p>
            </div>
          </div>
          <Button
            variant={appliedChanges.peakSeason ? 'default' : 'outline'}
            onClick={() => applyRecommendation('peakSeason', recommendations.peakSeasonRate)}
            className="w-full gap-2"
          >
            {appliedChanges.peakSeason ? <Check className="w-4 h-4" /> : 'Apply Peak Rate'}
          </Button>
        </CardContent>
      </Card>

      {/* Shoulder Season Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shoulder Season Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rate</p>
              <p className="text-2xl font-bold">£{recommendations.shoulderSeasonRate.rate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Dates</p>
              <p className="text-sm font-semibold">{recommendations.shoulderSeasonRate.dates}</p>
            </div>
          </div>
          <Button
            variant={appliedChanges.shoulderSeason ? 'default' : 'outline'}
            onClick={() => applyRecommendation('shoulderSeason', recommendations.shoulderSeasonRate)}
            className="w-full gap-2"
          >
            {appliedChanges.shoulderSeason ? <Check className="w-4 h-4" /> : 'Apply Shoulder Rate'}
          </Button>
        </CardContent>
      </Card>

      {/* Weekend Premium */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekend Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">Suggested Premium</p>
            <p className="text-2xl font-bold text-blue-600">+{recommendations.weekendPremium.percentage}%</p>
            <p className="text-sm text-gray-600 mt-2">{recommendations.weekendPremium.explanation}</p>
          </div>
          <Button
            variant={appliedChanges.weekendPremium ? 'default' : 'outline'}
            onClick={() => applyRecommendation('weekendPremium', recommendations.weekendPremium.percentage)}
            className="w-full gap-2"
          >
            {appliedChanges.weekendPremium ? <Check className="w-4 h-4" /> : 'Apply Weekend Premium'}
          </Button>
        </CardContent>
      </Card>

      {/* Surge Opportunities */}
      {recommendations.surgeOpportunities?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Surge Pricing Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              These dates show higher demand potential beyond school holidays:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recommendations.surgeOpportunities.map((surge, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{surge.dateRange}</p>
                      <p className="text-2xl font-bold text-amber-600">£{surge.rate}</p>
                      <p className="text-xs text-gray-600 mt-1">{surge.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={applySurgeOpportunities}
              variant={appliedChanges.surge ? 'default' : 'outline'}
              className="w-full gap-2"
            >
              {appliedChanges.surge ? <Check className="w-4 h-4" /> : 'Apply All Surge Pricing'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => setRecommendations(null)}
          className="w-full"
        >
          Get New Recommendations
        </Button>
      </div>
    </div>
  );
}