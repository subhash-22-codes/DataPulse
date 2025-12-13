import React from 'react';
import { format, toZonedTime } from 'date-fns-tz'; // Import toZonedTime
// NOTE: If using date-fns-tz v1/v2, import { utcToZonedTime } instead of toZonedTime

interface FormattedDateProps {
  dateString: string;
}

export const FormattedDate: React.FC<FormattedDateProps> = ({ dateString }) => {
  try {
    const indiaTimeZone = 'Asia/Kolkata';
    
    // 1. Ensure dateString is treated as UTC if it's missing the 'Z'
    // This prevents the browser from thinking "15:21" is already local time.
    const normalizedDateString = dateString.endsWith('Z') 
      ? dateString 
      : `${dateString}Z`;

    // 2. Convert UTC date -> Zoned Date (India Time)
    const zonedDate = toZonedTime(normalizedDateString, indiaTimeZone);

    // 3. Format it
    const formatted = format(zonedDate, 'dd MMM yyyy, hh:mm a', { timeZone: indiaTimeZone });
    
    return <span>{formatted} IST</span>;
  } catch (error) {
    console.error("Date Error:", error);
    return <span>Invalid date</span>;
  }
};