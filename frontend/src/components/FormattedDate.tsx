import React from 'react';
import { format } from 'date-fns-tz';

interface FormattedDateProps {
  dateString: string;
}

export const FormattedDate: React.FC<FormattedDateProps> = ({ dateString }) => {
  try {
    const indiaTimeZone = 'Asia/Kolkata';
    const date = new Date(dateString);

    const formatted = format(date, 'dd MMM yyyy, hh:mm a', { timeZone: indiaTimeZone });
    return <span>{formatted} IST</span>;
  } catch (error) {
    console.error(error);
    return <span>Invalid date</span>;
  }
};
