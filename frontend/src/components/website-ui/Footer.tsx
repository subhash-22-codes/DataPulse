import React, { useState, useEffect, useRef } from 'react';
import { Mail, MapPin, ChevronDown, ExternalLink, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface FooterLinkItem {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
}

// ─── ONE-SHOT IN-VIEW HOOK ─────────────────────────────────────────────────────
// Defined locally rather than imported from ./hooks/useInView — if that shared
// hook re-fires on every scroll-cross of the threshold (the same bug fixed
// elsewhere on this page), the footer's fade-in would flicker every time it
// crosses the viewport edge. Latching here removes that risk entirely.
function useLiveInView({ threshold = 0.1 } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView] as const;
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
const FooterLinkEl: React.FC<FooterLinkItem> = ({ label, to, href, external }) => {
  const base =
    'text-slate-500 hover:text-blue-600 transition-colors duration-200 text-sm font-medium font-manrope flex items-center gap-1 py-1';

  if (to) {
    return (
      <li>
        <Link to={to} className={base}>
          {label}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <a href={href ?? '#'} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={base}>
        {label}
        {external && <ExternalLink className="w-3 h-3 opacity-50" />}
      </a>
    </li>
  );
};

const AccordionSection: React.FC<{ title: string; links: FooterLinkItem[] }> = ({ title, links }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex justify-between items-center w-full text-left py-4"
        aria-expanded={open}
      >
        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest font-manrope">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-64 pb-4' : 'max-h-0'}`}>
        <ul className="space-y-1">
          {links.map((l) => <FooterLinkEl key={l.label} {...l} />)}
        </ul>
      </div>
    </div>
  );
};

// ─── FOOTER ───────────────────────────────────────────────────────────────────
export default function Footer() {
  const [footerRef, isFooterVisible] = useLiveInView({ threshold: 0.1 });
  const location = useLocation();

  // Updated to match the sections that actually exist on the current page.
  // "Architecture" pointed to a section that was removed; the GitHub issues
  // link exposed the repo, which is intentionally private right now.
  const productLinks: FooterLinkItem[] = [
    { label: 'Features',       href: '/#features'    },
    { label: 'How It Works',   href: '/#how-it-works' },
    { label: 'Security',       href: '/#trust'     },
  ];

  const companyLinks: FooterLinkItem[] = [
    { label: 'Who It\'s For',  href: '/#who-its-for' },
    { label: 'The Team',       href: '/#team'    },
    { label: 'Live Platform',  href: 'https://data-pulse-eight.vercel.app', external: true },
  ];

  const legalLinks: FooterLinkItem[] = [
    { label: 'Privacy Policy',    to: '/legal'             },
    { label: 'Terms of Service',  to: '/legal#tos-acceptance' },
    { label: 'Cookie Settings',   to: '/legal'             },
  ];

  const columns = [
    { title: 'Product', links: productLinks },
    { title: 'Company', links: companyLinks },
  ];

  return (
    <footer
      ref={footerRef}
      className={`relative bg-white border-t border-slate-200 transition-opacity duration-700 ${isFooterVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">

          {/* ── BRAND ─────────────────────────────────────────────────────── */}
          <div className="md:col-span-4 lg:col-span-4 space-y-5">
            <img
              src="/DPLogo2.png"
              alt="DataPulse"
              className="h-8 w-auto object-contain"
            />

            <p className="text-sm leading-relaxed text-slate-500 font-manrope max-w-xs">
              DataPulse watches your data sources so you don't have to.
              Connect a CSV, an API, or your database — and get notified
              the moment something changes, breaks, or drifts.
            </p>

            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600 font-manrope">
                Platform live · Early access
              </span>
            </div>

            {/* Contact */}
            <div className="space-y-3 pt-1">

              <a
                href="mailto:datapulseapp@gmail.com"
                className="flex items-center gap-3 group w-fit"
              >
                <div className="p-1.5 rounded-sm bg-blue-50 border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-slate-500 font-manrope group-hover:text-blue-600 transition-colors duration-200">
                  datapulseapp@gmail.com
                </span>
              </a>

              {/* Feedback / bug reports — kept in-house instead of linking to
                  the (private) GitHub issue tracker */}
              <a
                href="mailto:datapulseapp@gmail.com?subject=DataPulse%20Feedback"
                className="flex items-center gap-3 group w-fit"
              >
                <div className="p-1.5 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-200">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-slate-500 font-manrope group-hover:text-blue-600 transition-colors duration-200">
                  Report a bug or send feedback
                </span>
              </a>

              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-sm bg-slate-50 border border-slate-200 text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-slate-500 font-manrope">Hyderabad, India</span>
              </div>
            </div>
          </div>

          {/* ── DESKTOP NAV COLUMNS ───────────────────────────────────────── */}
          <div className="hidden md:grid md:col-span-8 lg:col-span-8 grid-cols-3 gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-manrope mb-5">
                  {col.title}
                </h4>
                <ul className="space-y-1">
                  {col.links.map((l) => <FooterLinkEl key={l.label} {...l} />)}
                </ul>
              </div>
            ))}

            {/* Legal desktop */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-manrope mb-5">
                Legal
              </h4>
              <ul className="space-y-1">
                {legalLinks.map((l) => <FooterLinkEl key={l.label} {...l} />)}
              </ul>
            </div>
          </div>

          {/* ── MOBILE ACCORDIONS ─────────────────────────────────────────── */}
          <div className="md:hidden col-span-1 border-t border-slate-100 -mt-4">
            {columns.map((col) => (
              <AccordionSection key={col.title} title={col.title} links={col.links} />
            ))}
            <AccordionSection title="Legal" links={legalLinks} />
          </div>

        </div>
      </div>

      {/* ── BOTTOM BAR ────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-400 font-medium font-manrope">
            &copy; {new Date().getFullYear()} DataPulse. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            {legalLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to ?? '/legal'}
                state={{ from: location.pathname }}
                className="text-xs text-slate-400 hover:text-slate-600 font-manrope transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}