import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function BetaExitPlanner() {
  const [selectedDate, setSelectedDate] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // Fetch current settings on mount
  const fetchSettings = async () => {
    try {
      const result = await base44.functions.invoke('getBetaSettings', {});
      setSettings(result.data);
    } catch {
      setSettings(null);
    }
  };

  const handleMigrateToBaseline = async () => {
    setMigrationLoading(true);
    setStatus(null);

    try {
      const result = await base44.functions.invoke('migrateToBaselineSubscriptions', {});

      setStatus({
        type: 'ok',
        message: `✅ Migrated ${result.data.migratedCount}/${result.data.totalHostCleaners} host/cleaner subscriptions to beta. All have 'founding_host_solo' as default next plan.`
      });
    } catch (e) {
      setStatus({ type: 'err', message: `❌ Migration failed: ${e.message}` });
    }

    setMigrationLoading(false);
  };

  const handleSetDate = async () => {
    if (!selectedDate) {
      setStatus({ type: 'err', message: '❌ Please select a date' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const result = await base44.functions.invoke('sendBetaExitEmails', { 
        beta_end_date: selectedDate 
      });

      setStatus({
        type: 'ok',
        message: `✅ Beta exit set for ${selectedDate}. Sent ${result.data.sentCount} transition emails to ${result.data.totalMembers} founding members.`
      });

      setSelectedDate('');
      await fetchSettings();
    } catch (e) {
      setStatus({ type: 'err', message: `❌ Failed: ${e.message}` });
    }

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Beta Exit Planner</h2>
        <p className="text-xs text-gray-400">Set the date when beta ends and founding members transition to paid tiers. Transition emails will be sent automatically.</p>
      </div>

      {settings?.beta_end_date && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <p className="text-blue-900">
            <strong>Current beta end date:</strong> {settings.beta_end_date}
            <br />
            <strong>Emails sent:</strong> {settings.emails_sent_count} founding members on {new Date(settings.emails_sent_at).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <Button
          onClick={handleMigrateToBaseline}
          disabled={migrationLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {migrationLoading ? 'Migrating...' : 'Step 1: Migrate All to Beta'}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Step 2: Select Exit Date</label>
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <Button
              onClick={handleSetDate}
              disabled={loading || !selectedDate}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? 'Setting...' : 'Set & Notify'}
            </Button>
          </div>
        </div>

        {status?.type === 'ok' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            {status.message}
          </div>
        )}

        {status?.type === 'err' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {status.message}
          </div>
        )}
      </div>

      {status?.type === 'ok' && status.message.includes('Migrated') && (
       <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
         {status.message}
       </div>
      )}

      <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
       <p><strong>Workflow:</strong></p>
       <ul className="list-disc list-inside space-y-0.5">
         <li><strong>Step 1:</strong> Click "Migrate All to Beta" — moves all host/cleaner subs to beta with default founding tier selected</li>
         <li><strong>Step 2:</strong> Users log in to Subscription page and choose their founding tier (£19/£49/£89)</li>
         <li><strong>Step 3:</strong> Select the beta exit date — transition emails sent automatically</li>
         <li>On exit date, members switch to their chosen founding tier (pricing locked for life)</li>
       </ul>
      </div>
    </div>
  );
}