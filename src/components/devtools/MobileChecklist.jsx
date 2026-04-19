import { useState } from 'react';

const MOBILE_SCREENS = [
  {
    group: '👤 Guest',
    screens: [
      { id: 'guest_home',        name: 'Home',                        desc: 'Hero section + property grid — no overflow, cards stack correctly' },
      { id: 'guest_search',      name: 'Search',                      desc: 'Filters visible and accessible, no horizontal overflow' },
      { id: 'guest_property',    name: 'Property Details',            desc: 'Photos display, booking bar sticky and visible' },
      { id: 'guest_signup',      name: 'GuestSignUp',                 desc: 'Form fields full-width, forename/surname inputs visible' },
      { id: 'guest_signin',      name: 'SignIn',                      desc: 'Password toggle button visible and tappable' },
      { id: 'guest_verify',      name: 'VerifyEmail',                 desc: 'Code input boxes large enough to tap easily' },
      { id: 'guest_trips',       name: 'My Trips',                    desc: 'Booking cards readable, Review button visible' },
    ],
  },
  {
    group: '🏠 Host',
    screens: [
      { id: 'host_dashboard',    name: 'HostDashboard',               desc: 'Stats cards in 2-col layout, calendar visible' },
      { id: 'host_properties',   name: 'HostProperties',              desc: 'Property cards stack correctly, no overflow' },
      { id: 'host_create',       name: 'CreateProperty',              desc: 'Steps 1/2/3 form layout readable, inputs full-width' },
      { id: 'host_edit',         name: 'EditProperty',                desc: 'Same as CreateProperty — all form sections visible' },
      { id: 'host_bookings',     name: 'HostBookings',                desc: 'Booking cards readable, action buttons tappable' },
      { id: 'host_subscription', name: 'Subscription',                desc: 'Plan cards visible, CTA button prominent' },
      { id: 'host_settings',     name: 'Settings',                    desc: 'Tabs switch correctly, Stripe connect button visible' },
      { id: 'host_verification', name: 'HostVerification',            desc: 'Document upload area accessible and tappable' },
    ],
  },
  {
    group: '🧹 Cleaner',
    screens: [
      { id: 'cleaner_dashboard',   name: 'CleanerDashboard',                   desc: 'Stat cards in 2-col, pending job cards show accept/decline buttons' },
      { id: 'cleaner_pricing',     name: 'CleanerPricing',                     desc: 'Rate card inputs readable and tappable' },
      { id: 'cleaner_completed',   name: 'CleanerDashboard (completed table)', desc: 'Completed jobs table scrolls horizontally without clipping' },
      { id: 'cleaner_payouts',     name: 'CleanerPayoutHistory',               desc: 'Month groups expand correctly, CSV button visible' },
      { id: 'cleaner_profile',     name: 'CleanerProfile (public)',            desc: 'Tabs switch, reviews list readable' },
      { id: 'cleaner_marketplace', name: 'CleanerMarketplace',                 desc: 'Cleaner cards stack correctly, no overflow' },
    ],
  },
];

const LS_KEY = 'devtools_mobile_checks';

export default function MobileChecklist() {
  const allScreens = MOBILE_SCREENS.flatMap(g => g.screens);
  const total = allScreens.length;

  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  });

  const set = (id, val) => {
    setState(prev => {
      const next = { ...prev, [id]: val };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    if (!confirm('Reset all mobile check results?')) return;
    setState({});
    localStorage.removeItem(LS_KEY);
  };

  const tested = allScreens.filter(s => state[s.id] != null).length;
  const failed  = allScreens.filter(s => state[s.id] === 'fail').length;
  const passed  = allScreens.filter(s => state[s.id] === 'pass').length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{tested}</span> of{' '}
            <span className="font-semibold text-gray-900">{total}</span> screens tested
          </span>
          {passed > 0 && <span className="text-green-700 font-medium">✅ {passed} passed</span>}
          {failed > 0 && <span className="text-red-700 font-medium">❌ {failed} failed</span>}
          {tested === total && failed === 0 && <span className="text-green-700 font-semibold">🎉 All clear!</span>}
        </div>
        <button
          onClick={reset}
          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Groups */}
      {MOBILE_SCREENS.map(group => (
        <div key={group.group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">{group.group}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {group.screens.map(screen => {
              const status = state[screen.id] || null;
              return (
                <div
                  key={screen.id}
                  className={`flex items-center gap-3 px-5 py-3.5 ${status === 'pass' ? 'bg-green-50' : status === 'fail' ? 'bg-red-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{screen.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{screen.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {status && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {status === 'pass' ? '✅ Pass' : '❌ Fail'}
                      </span>
                    )}
                    <button
                      onClick={() => set(screen.id, 'pass')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${status === 'pass' ? 'bg-green-600 text-white border-green-600' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => set(screen.id, 'fail')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${status === 'fail' ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}