const BinaryPattern = ({ opacity = 15 }: { opacity?: number }) => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ opacity: opacity / 100 }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circle top-left */}
        <circle cx="70" cy="80" r="55" stroke="white" strokeWidth="20" />

        {/* Horizontal bar top-center */}
        <rect x="200" y="50" width="140" height="22" fill="white" />

        {/* Circle top-right */}
        <circle cx="520" cy="90" r="65" stroke="white" strokeWidth="22" />

        {/* Vertical bar left */}
        <rect x="60" y="220" width="22" height="120" fill="white" />

        {/* Small circle center */}
        <circle cx="300" cy="280" r="40" stroke="white" strokeWidth="16" />

        {/* Horizontal bar right */}
        <rect x="420" y="300" width="130" height="20" fill="white" />

        {/* Circle center-left */}
        <circle cx="140" cy="480" r="60" stroke="white" strokeWidth="20" />

        {/* Vertical bar center */}
        <rect x="310" y="440" width="20" height="100" fill="white" />

        {/* Half circle right */}
        <path d="M 560 420 A 70 70 0 0 0 560 560" stroke="white" strokeWidth="20" fill="none" />

        {/* Horizontal bar bottom-left */}
        <rect x="30" y="660" width="120" height="20" fill="white" />

        {/* Circle bottom-center */}
        <circle cx="320" cy="700" r="50" stroke="white" strokeWidth="18" />

        {/* Small circle bottom-right */}
        <circle cx="520" cy="750" r="35" stroke="white" strokeWidth="14" />

        {/* Vertical bar bottom-left */}
        <rect x="180" y="780" width="18" height="90" fill="white" />
      </svg>
    </div>
  );
};

export default BinaryPattern;
