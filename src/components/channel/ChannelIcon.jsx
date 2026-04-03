export function ChannelIcon({ channel, className = "" }) {
  const icons = {
    airbnb: "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg",
    booking: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Booking.com_logo.svg",
    vrbo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/VRBO_Logo.svg"
  };

  return (
    <img
      src={icons[channel]}
      alt={channel}
      className={className}
    />
  );
}