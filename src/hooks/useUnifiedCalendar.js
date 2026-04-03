import { useQuery } from "@tanstack/react-query";
import { getUnifiedCalendar } from "@/utils/api/calendar";

export function useUnifiedCalendar(propertyId) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["unified-calendar", propertyId],
    queryFn: () => getUnifiedCalendar(propertyId),
    enabled: !!propertyId
  });

  return {
    internal: data?.internal || [],
    external: data?.external || [],
    conflicts: data?.conflicts || [],
    loading: isLoading,
    error,
    refetch
  };
}