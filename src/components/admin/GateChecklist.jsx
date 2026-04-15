import { CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function Gate({ label, passed, hint }) {
  return (
    <div className="flex items-center gap-1.5">
      {passed
        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
      <span className={`text-xs ${passed ? "text-green-700" : "text-red-500"}`}>{label}</span>
      {hint && <span className="text-xs text-gray-400">({hint})</span>}
    </div>
  );
}

export default function GateChecklist({ member }) {
  const docsSubmittedHint = !member.documents_verified && member.documents_submitted_at
    ? `submitted ${formatDistanceToNow(new Date(member.documents_submitted_at), { addSuffix: true })}`
    : null;

  return (
    <div className="flex flex-col gap-1 py-0.5">
      <Gate label="Docs" passed={!!member.documents_verified} hint={docsSubmittedHint} />
      <Gate label="Stripe" passed={!!member.stripe_verified} />
      <Gate label="Subscription" passed={!!member.subscription_active} />
    </div>
  );
}