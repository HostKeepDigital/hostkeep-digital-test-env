import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, CheckCircle2, Upload } from 'lucide-react';

const CATEGORIES = {
  not_as_described: {
    label: 'Not As Described',
    issues: [
      'Fewer bedrooms or bathrooms than listed',
      'Amenities missing or not working',
      'Photos significantly different to reality',
      'Wrong location or property type',
    ],
  },
  property_condition: {
    label: 'Property Condition',
    issues: [
      'Property not clean at check-in',
      'Pest or vermin present',
      'Safety hazard present',
      'Maintenance issue affecting stay',
    ],
  },
  host_conduct: {
    label: 'Host Conduct',
    issues: [
      'Host unresponsive during stay',
      'Host entered property without permission',
      'Host threatening or made me uncomfortable',
    ],
  },
  checkin_issue: {
    label: 'Check-in Issue',
    issues: [
      'Could not access the property',
      'Check-in instructions wrong or missing',
      'Property occupied by someone else',
    ],
  },
  partial_stay: {
    label: 'Partial Stay',
    issues: ['I had to leave early', 'I am requesting a refund for unused nights'],
  },
};

export default function ComplaintModal({ isOpen, onClose, booking }) {
  const [step, setStep] = useState(1); // 1-6
  const [category, setCategory] = useState('');
  const [specificIssue, setSpecificIssue] = useState('');
  const [guestSituation, setGuestSituation] = useState('');
  const [nightsStayed, setNightsStayed] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const [requestedResolution, setRequestedResolution] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        setEvidenceUrls((prev) => [...prev, res.file_url]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!category || !specificIssue || !description || !requestedResolution) {
        throw new Error('Please complete all required fields');
      }

      if (description.length < 50) {
        throw new Error('Description must be at least 50 characters');
      }

      const payload = {
        booking_id: booking.id,
        raised_by: 'guest',
        category,
        specific_issue: specificIssue,
        description,
        evidence_urls: evidenceUrls,
        guest_situation: guestSituation,
        nights_stayed: nightsStayed ? parseInt(nightsStayed) : undefined,
        requested_resolution: requestedResolution,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : undefined,
      };

      await base44.functions.invoke('raiseComplaint', { ...payload, session_token: localStorage.getItem('session_token') });
      setSubmitted(true);

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Complaint Submitted
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Your complaint has been submitted. Our team will review it and be in touch within 24 hours. Your payment is now frozen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              Raise a Complaint
            </h2>
            <span className="text-sm text-gray-500 ml-auto">
              Step {step} of 6
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Step 1: Category */}
          {step === 1 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Select category</h3>
              <div className="space-y-2">
                {Object.entries(CATEGORIES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCategory(key);
                      setSpecificIssue('');
                      setStep(2);
                    }}
                    className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-colors"
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Specific Issue */}
          {step === 2 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">
                Select specific issue
              </h3>
              <div className="space-y-2">
                {CATEGORIES[category]?.issues.map((issue) => (
                  <button
                    key={issue}
                    onClick={() => {
                      setSpecificIssue(issue);
                      setStep(3);
                    }}
                    className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-colors"
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Guest Situation */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Are you still in the property?
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setGuestSituation('still_in_property');
                      setStep(4);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setGuestSituation('completed_stay')}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>

              {guestSituation && guestSituation !== 'still_in_property' && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Did you leave on the day of arrival?
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGuestSituation('left_same_day');
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        setGuestSituation('left_early');
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {guestSituation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How many nights have you stayed so far?
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nightsStayed}
                    onChange={(e) => setNightsStayed(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Button
                    onClick={() => setStep(4)}
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Description */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe what happened *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details (minimum 50 characters)"
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/50 characters minimum
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload photos or video
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="w-full"
                />
                {evidenceUrls.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-2">
                    {evidenceUrls.length} file(s) uploaded
                  </p>
                )}
              </div>

              <Button
                onClick={() => setStep(5)}
                disabled={description.length < 50}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 5: Resolution */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">
                What resolution are you requesting?
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setRequestedResolution('full_refund');
                    setStep(6);
                  }}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-colors"
                >
                  Full refund
                </button>
                <button
                  onClick={() => setRequestedResolution('partial_refund')}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-colors"
                >
                  Partial refund
                </button>
                <button
                  onClick={() => {
                    setRequestedResolution('on_record_only');
                    setStep(6);
                  }}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 transition-colors"
                >
                  I just want this on record
                </button>
              </div>

              {requestedResolution === 'partial_refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fair amount in £
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Button
                    onClick={() => setStep(6)}
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Confirmation */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Complaint Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Category: {CATEGORIES[category]?.label}</p>
                  <p>Issue: {specificIssue}</p>
                  <p>Description: {description.slice(0, 50)}...</p>
                  <p>
                    Resolution:{' '}
                    {requestedResolution === 'full_refund'
                      ? 'Full refund'
                      : requestedResolution === 'partial_refund'
                      ? `Partial refund (£${requestedAmount})`
                      : 'On record only'}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>⚠️ Warning:</strong> Once submitted your complaint cannot be
                withdrawn. The rental payment will be frozen until HostKeep admin has
                reviewed your case.
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Submitting...' : 'Submit Complaint'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}