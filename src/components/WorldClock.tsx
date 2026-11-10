import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

interface TimeZoneClock {
  name: string;
  timezone: string;
  offset: string;
  time: string;
  abbreviation: string;
}

const TIMEZONES = [
  { name: "New York", timezone: "America/New_York", offset: "UTC-5/-4" },
  { name: "London", timezone: "Europe/London", offset: "UTC+0/+1" },
  { name: "Bratislava", timezone: "Europe/Bratislava", offset: "UTC+1/+2" },
  { name: "Tokyo", timezone: "Asia/Tokyo", offset: "UTC+9" },
  { name: "Sydney", timezone: "Australia/Sydney", offset: "UTC+10/+11" },
  { name: "Dubai", timezone: "Asia/Dubai", offset: "UTC+4" },
  { name: "Los Angeles", timezone: "America/Los_Angeles", offset: "UTC-8/-7" },
  { name: "Singapore", timezone: "Asia/Singapore", offset: "UTC+8" },
];

export function WorldClock() {
  const [clocks, setClocks] = useState<TimeZoneClock[]>([]);

  useEffect(() => {
    const updateClocks = () => {
      const updatedClocks = TIMEZONES.map((tz) => {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

        const abbrevFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz.timezone,
          timeZoneName: "short",
        });

        const time = formatter.format(new Date());
        const parts = abbrevFormatter.formatToParts(new Date());
        const abbreviation =
          parts.find((p) => p.type === "timeZoneName")?.value || "UTC";

        return {
          ...tz,
          time,
          abbreviation,
        };
      });

      setClocks(updatedClocks);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">World Clock</h2>
      </div>

      {/* Grid of Clocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clocks.map((clock) => (
          <div
            key={clock.timezone}
            className="rounded-2xl bg-card p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Location Name */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                {clock.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {clock.offset}
              </p>
            </div>

            {/* Digital Time Display */}
            <div className="mb-3">
              <div className="font-mono text-4xl font-bold text-primary tracking-wider">
                {clock.time}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {clock.abbreviation}
              </p>
            </div>

            {/* Timezone ID */}
            <div className="text-xs text-muted-foreground truncate">
              {clock.timezone}
            </div>
          </div>
        ))}
      </div>

      {/* Current Local Time */}
      <div className="mt-8 rounded-2xl bg-gradient-brand p-6 text-white">
        <p className="text-sm font-medium opacity-90 mb-1">Your Local Time</p>
        <div className="font-mono text-5xl font-bold tracking-wider">
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
        <p className="text-sm opacity-75 mt-2">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
