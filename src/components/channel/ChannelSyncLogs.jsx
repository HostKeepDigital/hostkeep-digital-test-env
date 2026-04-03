export function ChannelSyncLogs({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No sync activity recorded yet for this channel.
      </p>
    );
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between border-b last:border-b-0 py-1"
        >
          <div>
            <p className="font-medium">
              {log.type} –{" "}
              <span
                className={
                  log.status === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {log.status}
              </span>
            </p>
            {log.error_message && (
              <p className="text-[11px] text-red-500">
                {log.error_message}
              </p>
            )}
          </div>
          <span className="text-[11px] text-gray-500">
            {new Date(log.run_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}