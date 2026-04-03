import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getChannelOverview } from "@/utils/api/channelManager";
import { ChannelOverviewCard } from "@/components/channel/ChannelOverviewCard";

export default function ChannelOverviewPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["channel-overview", user?.id],
    queryFn: () => getChannelOverview(user.id),
    enabled: !!user?.id
  });

  const overview = data?.overview || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Channel Overview</h1>
      <p className="text-sm text-gray-600">
        View all channel connections across your properties.
      </p>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading…</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {overview.map((group) => (
          <ChannelOverviewCard
            key={group.property.id}
            property={group.property}
            listings={group.listings}
          />
        ))}
      </div>

      {overview.length === 0 && !isLoading && (
        <p className="text-sm text-gray-500">
          No properties found.
        </p>
      )}
    </div>
  );
}