import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getConflicts } from "@/utils/api/channelManager";
import { ConflictResolver } from "@/components/channel/ConflictResolver";

export default function ConflictPage() {
  const { user } = useAuth();

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["conflicts", user?.id],
    queryFn: () => getConflicts(user.id),
    enabled: !!user?.id
  });

  const conflicts = data?.conflicts || [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Booking Conflicts</h1>
      <p className="text-sm text-gray-600">
        These conflicts occur when external OTA bookings overlap with internal bookings.
      </p>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      <ConflictResolver conflicts={conflicts} reload={refetch} />

      {conflicts.length === 0 && !isLoading && (
        <p className="text-sm text-gray-500">No conflicts found.</p>
      )}
    </div>
  );
}