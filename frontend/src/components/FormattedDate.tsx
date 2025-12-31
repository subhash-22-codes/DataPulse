import React from 'react';
import { format, toZonedTime } from 'date-fns-tz'; // Import toZonedTime
// NOTE: If using date-fns-tz v1/v2, import { utcToZonedTime } instead of toZonedTime

interface FormattedDateProps {
  dateString: string;
}
export const FormattedDate: React.FC<FormattedDateProps> = ({ dateString }) => {
  if (!dateString) return <span>N/A</span>;

  try {
    const indiaTimeZone = 'Asia/Kolkata';
    
    // 1. Just create the date object. 
    // Modern browsers and date-fns handle +00:00 perfectly.
    const date = new Date(dateString);

    // 2. Safety check: Is it actually a valid date?
    if (isNaN(date.getTime())) {
        return <span>Invalid date</span>;
    }

    // 3. Convert and Format
    const zonedDate = toZonedTime(date, indiaTimeZone);
    const formatted = format(zonedDate, 'dd MMM yyyy, hh:mm a', { timeZone: indiaTimeZone });
    
    return <span>{formatted} IST</span>;
  } catch (error) {
    console.error("Formatting Error:", error);
    return <span>Invalid date</span>;
  }
};