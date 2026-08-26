'use client'

import Link from 'next/link'

interface AnimatedBrandLogoProps {
  className?: string
  href?: string | null
  gradientId?: string
}

function AnimatedLogoSvg({
  className = 'h-10 md:h-11 w-auto',
  gradientId = 'brandWaveGradient',
}: {
  className?: string
  gradientId?: string
}) {
  return (
    <svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${gradientId}Text`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="45%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>

      <g transform="translate(20, 30)">
        <rect x="0" y="20" width="3" height="20" fill={`url(#${gradientId})`} rx="1.5">
          <animate attributeName="height" values="20;35;20" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="y" values="20;12.5;20" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="8" y="15" width="3" height="30" fill={`url(#${gradientId})`} rx="1.5">
          <animate attributeName="height" values="30;40;30" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="y" values="15;10;15" dur="1.8s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="10" width="3" height="40" fill={`url(#${gradientId})`} rx="1.5">
          <animate attributeName="height" values="40;45;40" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="10;7.5;10" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="18" width="3" height="24" fill={`url(#${gradientId})`} rx="1.5">
          <animate attributeName="height" values="24;38;24" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y" values="18;11;18" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="32" y="12" width="3" height="36" fill={`url(#${gradientId})`} rx="1.5">
          <animate attributeName="height" values="36;42;36" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y" values="12;9;12" dur="1.6s" repeatCount="indefinite" />
        </rect>

        <path
          d="M45 25 L55 20 L53 22 L58 22 L58 28 L53 28 L55 30 Z"
          fill={`url(#${gradientId})`}
          opacity="0.8"
        >
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
        </path>
        <path
          d="M45 35 L55 30 L53 32 L58 32 L58 38 L53 38 L55 40 Z"
          fill={`url(#${gradientId})`}
          opacity="0.6"
        >
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
        </path>
      </g>

      <text
        x="100"
        y="60"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="20"
        fill={`url(#${gradientId}Text)`}
      >
        RDISTRO
      </text>
      <text
        x="100"
        y="76"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="300"
        fontSize="12"
        fill="#6b7280"
        letterSpacing="2px"
      >
        MUSIC DISTRIBUTION
      </text>

      <circle cx="75" cy="30" r="2" fill="#8b5cf6" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="45" r="1.5" fill="#ec4899" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="85" cy="35" r="1" fill="#6366f1" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export default function AnimatedBrandLogo({
  className = 'h-10 md:h-11 w-auto',
  href = '/',
  gradientId = 'brandWaveGradient',
}: AnimatedBrandLogoProps) {
  const logo = <AnimatedLogoSvg className={className} gradientId={gradientId} />

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {logo}
      </Link>
    )
  }

  return logo
}

export function AnimatedLogoMark({
  className = 'h-10 w-10',
  gradientId = 'logoMarkGradient',
}: {
  className?: string
  gradientId?: string
}) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <g transform="translate(12, 18)">
        <rect x="0" y="16" width="5" height="16" fill={`url(#${gradientId})`} rx="2.5">
          <animate attributeName="height" values="16;28;16" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="y" values="16;10;16" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="10" y="12" width="5" height="24" fill={`url(#${gradientId})`} rx="2.5">
          <animate attributeName="height" values="24;32;24" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="y" values="12;8;12" dur="1.8s" repeatCount="indefinite" />
        </rect>
        <rect x="20" y="6" width="5" height="36" fill={`url(#${gradientId})`} rx="2.5">
          <animate attributeName="height" values="36;40;36" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="6;4;6" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="30" y="14" width="5" height="20" fill={`url(#${gradientId})`} rx="2.5">
          <animate attributeName="height" values="20;30;20" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y" values="14;9;14" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="40" y="8" width="5" height="32" fill={`url(#${gradientId})`} rx="2.5">
          <animate attributeName="height" values="32;38;32" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y" values="8;5;8" dur="1.6s" repeatCount="indefinite" />
        </rect>
      </g>
    </svg>
  )
}
