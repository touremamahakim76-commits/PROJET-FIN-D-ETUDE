export default function BrandLogo({ className = 'h-10 w-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Logo Serenite Mobilite"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="serenity-logo-bg" x1="10" y1="8" x2="54" y2="58">
          <stop stopColor="#008BD2" />
          <stop offset="1" stopColor="#6C4DFF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#serenity-logo-bg)" />
      <path
        d="M13 42c7-11 16-17 27-18 5-.5 9 .2 12 2"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="4"
        opacity=".78"
      />
      <path
        d="M15 49c9-8 18-12 29-12"
        fill="none"
        stroke="#B7F7D2"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="32" cy="23" r="9" fill="#FFFFFF" />
      <path
        d="M25 37c2.5-4.5 11.5-4.5 14 0"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M27.5 23.5c1.2 1.4 2.7 2.1 4.5 2.1s3.3-.7 4.5-2.1"
        fill="none"
        stroke="#008BD2"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <circle cx="25" cy="49" r="3" fill="#FFFFFF" />
      <circle cx="45" cy="37" r="3" fill="#FFFFFF" />
    </svg>
  )
}
