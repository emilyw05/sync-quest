"use client";

import * as React from "react";
import { Apple, CalendarDays, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  buildIcsDataUrl,
  buildOutlookCalendarUrl,
} from "@/lib/calendar-export";

type Props = {
  title: string;
  description?: string;
  startUtc: string;
  endUtc: string;
  uid: string;
};

export function CalendarLoot({ title, description, startUtc, endUtc, uid }: Props) {
  const event = React.useMemo(
    () => ({
      title,
      description,
      startUtc: new Date(startUtc),
      endUtc: new Date(endUtc),
    }),
    [title, description, startUtc, endUtc],
  );

  const googleUrl = React.useMemo(() => buildGoogleCalendarUrl(event), [event]);
  const outlookUrl = React.useMemo(() => buildOutlookCalendarUrl(event), [event]);
  const icsUrl = React.useMemo(() => buildIcsDataUrl(event, uid), [event, uid]);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button asChild variant="outline" size="lg">
        <a href={googleUrl} target="_blank" rel="noreferrer noopener">
          <CalendarDays className="h-4 w-4 text-secondary" />
          Add to Google
        </a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href={outlookUrl} target="_blank" rel="noreferrer noopener">
          <Mail className="h-4 w-4 text-primary" />
          Add to Outlook
        </a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href={icsUrl} download={`${uid}.ics`}>
          <Apple className="h-4 w-4 text-accent" />
          Apple / .ics
        </a>
      </Button>
    </div>
  );
}
