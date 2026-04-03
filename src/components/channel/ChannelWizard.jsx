import { useState } from "react";
import { ChannelSelect } from "./ChannelSelect";
import { ChannelSetupForm } from "./ChannelSetupForm";

export function ChannelWizard({ propertyId }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState(null);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4 max-w-xl">
      {step === 1 && (
        <ChannelSelect
          onSelect={(c) => {
            setChannel(c);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <ChannelSetupForm
          propertyId={propertyId}
          channel={channel}
          onBack={() => setStep(1)}
          onComplete={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Channel Connected</h2>
          <p className="text-sm text-gray-600">
            Your calendar is now syncing with {channel.label}.
          </p>
        </div>
      )}
    </div>
  );
}