// Нәзік қазақ оюы (қошқар мүйіз) — бөлгіш сызық. Алтын түсі: #C9A568
export default function Ornament({ width = 220, color = '#c9a568', className = '' }) {
  return (
    <svg className={`ornament ${className}`} width={width} height="28" viewBox="0 0 220 28" aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 14 H82" opacity="0.6" />
        <path d="M138 14 H216" opacity="0.6" />
        {/* орталық қошқар мүйіз */}
        <path d="M110 22 V12 C110 6 102 4 98 8 C95 11 97 16 101 15 C104 14 103 11 101 11" />
        <path d="M110 12 C110 6 118 4 122 8 C125 11 123 16 119 15 C116 14 117 11 119 11" />
        <path d="M104 22 H116" />
        {/* бүйір кішкене мүйіздер */}
        <path d="M88 14 C88 10 84 9 82.5 11.5 C81.5 13.5 84 15 85.2 13.4" />
        <path d="M132 14 C132 10 136 9 137.5 11.5 C138.5 13.5 136 15 134.8 13.4" />
        <circle cx="94" cy="14" r="1.6" fill={color} stroke="none" />
        <circle cx="126" cy="14" r="1.6" fill={color} stroke="none" />
      </g>
    </svg>
  )
}
